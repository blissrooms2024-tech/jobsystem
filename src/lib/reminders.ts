import { and, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { jobs, units, users } from "@/db/schema";
import { sendMail } from "@/lib/mailer";

const MY_TZ_OFFSET = "+08:00"; // Malaysia is fixed UTC+8, no DST

function myToday(): string {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

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
    ${link ? `<p><a href="${link}">查看任务详情 View job</a></p>` : ""}
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
        eq(jobs.status, "assigned"),
        eq(jobs.advanceReminded, false),
        isNotNull(users.email),
      ),
    );

  for (const { job, assignee, unit } of advanceCandidates) {
    if (!assignee.email) continue;
    await sendMail({
      to: assignee.email,
      subject: `明天有任务安排：${job.title} Reminder: job tomorrow`,
      html: jobEmailHtml(`${assignee.name}，你好，明天有一个任务安排：`, [
        `任务 Job: ${job.title}`,
        `日期 Date: ${job.schedDate}`,
        unit ? `地点 Location: ${unit.unitName}` : "",
        job.startTime ? `开始时间 Start: ${job.startTime}` : "",
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
        eq(jobs.status, "assigned"),
        eq(jobs.startReminded, false),
        isNotNull(users.email),
        isNotNull(jobs.startTime),
      ),
    );

  const now = Date.now();
  for (const { job, assignee, unit } of startCandidates) {
    if (!assignee.email || !job.startTime) continue;
    const startInstant = new Date(`${job.schedDate}T${job.startTime}${MY_TZ_OFFSET}`).getTime();
    const minutesUntilStart = (startInstant - now) / 60000;
    if (minutesUntilStart < 0 || minutesUntilStart > 65) continue;

    await sendMail({
      to: assignee.email,
      subject: `任务即将开始：${job.title} Reminder: job starting soon`,
      html: jobEmailHtml(`${assignee.name}，你好，这个任务快开始了：`, [
        `任务 Job: ${job.title}`,
        `开始时间 Start: ${job.startTime}`,
        unit ? `地点 Location: ${unit.unitName}` : "",
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
