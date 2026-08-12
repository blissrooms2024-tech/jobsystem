import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { jobs, units, users } from "@/db/schema";
import { sendMail } from "@/lib/mailer";
import { jobEndInstant, jobStartInstant, myToday } from "@/lib/job-timing";

const MY_TZ_OFFSET = "+08:00"; // Malaysia is fixed UTC+8, no DST

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00${MY_TZ_OFFSET}`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function appUrl() {
  return process.env.APP_URL?.replace(/\/$/, "") ?? "";
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
  for (const u of candidates) {
    const lastActivity = u.lastSeenAt ?? u.createdAt;
    if (lastActivity < cutoff) {
      await db.update(users).set({ active: false }).where(eq(users.id, u.id));
      deactivated++;
    }
  }
  return deactivated;
}
