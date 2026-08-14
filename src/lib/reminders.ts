import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { appSettings, jobs, units, users } from "@/db/schema";
import { sendMail } from "@/lib/mailer";
import { appUrl } from "@/lib/app-url";
import { ADMIN_NOTIFY_EMAIL } from "@/lib/admin-notify";
import { jobEndInstant, jobStartInstant, myToday } from "@/lib/job-timing";

const MY_TZ_OFFSET = "+08:00"; // Malaysia is fixed UTC+8, no DST

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00${MY_TZ_OFFSET}`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function jobEmailHtml(title: string, lines: string[], jobId: string) {
  const link = appUrl() ? `${appUrl()}/jobs/${jobId}` : "";
  return `
    <p>${title}</p>
    <ul>${lines.map((l) => `<li>${l}</li>`).join("")}</ul>
    ${link ? `<p><a href="${link}">View job</a></p>` : ""}
  `;
}

/**
 * Fired right when a job is created/assigned (not on the reminder
 * schedule) so the employee finds out immediately rather than waiting for
 * the day-before reminder. Best-effort — a missing/broken email address
 * shouldn't fail job creation, so callers should wrap this in try/catch.
 */
export async function notifyJobAssigned(opts: {
  jobId: string;
  assigneeId: string;
  title: string;
  dates: string[];
  unitName?: string | null;
  startTime?: string | null;
}) {
  const [assignee] = await db.select().from(users).where(eq(users.id, opts.assigneeId)).limit(1);
  if (!assignee?.email) return;

  const datesLabel =
    opts.dates.length === 1
      ? opts.dates[0]
      : `${opts.dates[0]} – ${opts.dates[opts.dates.length - 1]} (${opts.dates.length} days)`;

  await sendMail({
    to: assignee.email,
    subject: `New job assigned: ${opts.title}`,
    html: jobEmailHtml(
      `Hi ${assignee.name}, a new job has been assigned to you:`,
      [
        `Job: ${opts.title}`,
        `Date: ${datesLabel}`,
        opts.unitName ? `Location: ${opts.unitName}` : "",
        opts.startTime ? `Start: ${opts.startTime}` : "",
      ].filter(Boolean),
      opts.jobId,
    ),
  });
}

/**
 * Two reminder passes, meant to be called on a schedule (every ~30 min):
 * - "advance": once, the day before a job's scheduled date
 * - "start": once, in the ~1 hour window before the job's start time
 * Both are idempotent via the advanceReminded/startReminded flags on jobs,
 * so calling this repeatedly never double-sends.
 */
export async function runReminders() {
  const today = myToday();
  const tomorrow = addDays(today, 1);
  let advanceSent = 0;
  let startSent = 0;

  const advanceCandidates = await db
    .select({ job: jobs, assignee: users, unit: units })
    .from(jobs)
    .innerJoin(users, eq(jobs.assignedTo, users.id))
    .leftJoin(units, eq(jobs.unitId, units.id))
    .where(
      and(
        eq(jobs.schedDate, tomorrow),
        inArray(jobs.status, ["assigned", "in_progress"]),
        eq(jobs.advanceReminded, false),
        isNotNull(users.email),
      ),
    );

  for (const { job, assignee, unit } of advanceCandidates) {
    if (!assignee.email) continue;
    await sendMail({
      to: assignee.email,
      subject: `Reminder: job tomorrow — ${job.title}`,
      html: jobEmailHtml(`Hi ${assignee.name}, you have a job scheduled tomorrow:`, [
        `Job: ${job.title}`,
        `Date: ${job.schedDate}`,
        unit ? `Location: ${unit.unitName}` : "",
        job.startTime ? `Start: ${job.startTime}` : "",
      ].filter(Boolean), job.id),
    });
    await db
      .update(jobs)
      .set({ advanceReminded: true, reminderSent: true })
      .where(eq(jobs.id, job.id));
    advanceSent++;
  }

  const startCandidates = await db
    .select({ job: jobs, assignee: users, unit: units })
    .from(jobs)
    .innerJoin(users, eq(jobs.assignedTo, users.id))
    .leftJoin(units, eq(jobs.unitId, units.id))
    .where(
      and(
        eq(jobs.schedDate, today),
        inArray(jobs.status, ["assigned", "in_progress"]),
        eq(jobs.startReminded, false),
        isNotNull(users.email),
        isNotNull(jobs.startTime),
      ),
    );

  const now = Date.now();
  for (const { job, assignee, unit } of startCandidates) {
    if (!assignee.email || !job.startTime) continue;
    const minutesUntilStart = (jobStartInstant(job.schedDate, job.startTime) - now) / 60000;
    if (minutesUntilStart < 0 || minutesUntilStart > 65) continue;

    await sendMail({
      to: assignee.email,
      subject: `Reminder: job starting soon — ${job.title}`,
      html: jobEmailHtml(`Hi ${assignee.name}, this job is starting soon:`, [
        `Job: ${job.title}`,
        `Start: ${job.startTime}`,
        unit ? `Location: ${unit.unitName}` : "",
      ].filter(Boolean), job.id),
    });
    await db
      .update(jobs)
      .set({ startReminded: true, reminderSent: true })
      .where(eq(jobs.id, job.id));
    startSent++;
  }

  return { advanceSent, startSent };
}

/**
 * Payroll is paid out every Tuesday before 12pm, so admin needs it settled
 * by Monday. Nudges ADMIN_NOTIFY_EMAIL once, the first time this runs on a
 * Monday each week — idempotent via appSettings so a cron firing every
 * ~30 min doesn't send it repeatedly the same day.
 */
export async function sendPayrollReminder() {
  const today = myToday();
  const dayOfWeek = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sun, 1 = Mon
  if (dayOfWeek !== 1) return { sent: false };

  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, "lastPayrollReminderDate"))
    .limit(1);
  if (row?.value === today) return { sent: false };

  const link = appUrl();
  await sendMail({
    to: ADMIN_NOTIFY_EMAIL,
    subject: "Payroll reminder — settle today, payout is tomorrow before 12pm",
    html: `
      <p>Reminder: payroll is paid out every Tuesday before 12pm.</p>
      <p>Please make sure this week's payroll is reviewed and settled today (Monday).</p>
      ${link ? `<p><a href="${link}/payroll">Go to Payroll</a></p>` : ""}
    `,
  });

  await db
    .insert(appSettings)
    .values({ key: "lastPayrollReminderDate", value: today })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: today } });

  return { sent: true };
}

/**
 * Mirrors the legacy hourly sweep: any Assigned/In-progress job whose window
 * has already ended gets auto-marked Missed, so a forgotten check-in doesn't
 * just sit open forever. Reopened jobs are exempt (admin already vouched for
 * late completion).
 */
export async function sweepMissedJobs() {
  const candidates = await db
    .select()
    .from(jobs)
    .where(and(inArray(jobs.status, ["assigned", "in_progress"]), eq(jobs.reopened, false)));

  const now = Date.now();
  let missed = 0;
  for (const job of candidates) {
    const end = jobEndInstant(job.schedDate, job.endTime);
    if (now > end) {
      await db.update(jobs).set({ status: "missed" }).where(eq(jobs.id, job.id));
      missed++;
    }
  }
  return missed;
}

const INACTIVITY_DAYS = 7;

/**
 * Auto-deactivates staff (employee/supervisor only — never boss/admin, to
 * avoid an admin locking themselves out) who haven't opened the app in 7
 * days. "Seen" is the presence heartbeat's lastSeenAt; a user who has never
 * logged in at all is measured from their account creation date instead,
 * so brand-new accounts aren't deactivated the instant this sweep runs.
 * Admin can always flip a user back to Active from the Users page.
 */
export async function sweepInactiveUsers() {
  const cutoff = new Date(Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000);
  const candidates = await db
    .select()
    .from(users)
    .where(and(eq(users.active, true), inArray(users.role, ["employee", "supervisor"])));

  let deactivated = 0;
  const deactivatedNames: string[] = [];
  for (const u of candidates) {
    const lastActivity = u.lastSeenAt ?? u.createdAt;
    if (lastActivity < cutoff) {
      await db.update(users).set({ active: false }).where(eq(users.id, u.id));
      deactivated++;
      deactivatedNames.push(`${u.staffId ?? u.userCode} · ${u.name}`);
    }
  }

  if (deactivatedNames.length > 0) {
    try {
      const link = appUrl();
      await sendMail({
        to: ADMIN_NOTIFY_EMAIL,
        subject: `${deactivatedNames.length} employee(s) auto-deactivated for inactivity`,
        html: `
          <p>These accounts haven't opened the app in ${INACTIVITY_DAYS}+ days and were automatically set to Inactive:</p>
          <ul>${deactivatedNames.map((n) => `<li>${n}</li>`).join("")}</ul>
          <p>If this was expected (e.g. resigned staff), no action needed. Otherwise, reactivate them from the Users page.</p>
          ${link ? `<p><a href="${link}/users">Go to Users</a></p>` : ""}
        `,
      });
    } catch (err) {
      console.error("Failed to notify admin of auto-deactivations", err);
    }
  }

  return deactivated;
}
