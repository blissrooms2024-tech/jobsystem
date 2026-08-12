const MY_TZ_OFFSET = "+08:00"; // Malaysia is fixed UTC+8, no DST
export const CHECKIN_GRACE_MIN = 30; // can check in up to 30 min before start
export const SCHEDULE_AHEAD_DAYS = 60; // matches legacy system's ~2 month window

/** Job's scheduled window start, as a real instant. Defaults to 00:00 if no StartTime set. */
export function jobStartInstant(schedDate: string, startTime: string | null): number {
  const t = startTime ? startTime.slice(0, 5) : "00:00";
  return new Date(`${schedDate}T${t}:00${MY_TZ_OFFSET}`).getTime();
}

/** Job's scheduled window end, as a real instant. Defaults to 23:59:59 if no EndTime set. */
export function jobEndInstant(schedDate: string, endTime: string | null): number {
  const t = endTime ? endTime.slice(0, 5) : "23:59";
  return new Date(`${schedDate}T${t}:59${MY_TZ_OFFSET}`).getTime();
}

export function myToday(): string {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

/**
 * Throws a user-facing error if `now` falls outside the job's check-in
 * window (too early / too late). A reopened job skips this entirely, same
 * as the legacy system — admin already vouched for late completion.
 */
export function assertWithinCheckinWindow(job: {
  schedDate: string;
  startTime: string | null;
  endTime: string | null;
  reopened: boolean;
}) {
  if (job.reopened) return;
  const now = Date.now();
  const start = jobStartInstant(job.schedDate, job.startTime);
  const end = jobEndInstant(job.schedDate, job.endTime);
  if (now < start - CHECKIN_GRACE_MIN * 60000) {
    throw new Error(
      `太早了 Too early — this job starts at ${job.schedDate} ${job.startTime ?? ""}. You can check in from ${CHECKIN_GRACE_MIN} min before.`,
    );
  }
  if (now > end) {
    throw new Error("太晚了，任务时间已过 Too late — the job window has ended.");
  }
}

export function maxSchedulableDate(): string {
  const d = new Date(`${myToday()}T00:00:00${MY_TZ_OFFSET}`);
  d.setUTCDate(d.getUTCDate() + SCHEDULE_AHEAD_DAYS);
  return d.toISOString().slice(0, 10);
}

/** Inclusive list of ISO date strings from start to end (both YYYY-MM-DD). */
export function datesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  let cursor = new Date(`${start}T00:00:00${MY_TZ_OFFSET}`);
  const endDate = new Date(`${end}T00:00:00${MY_TZ_OFFSET}`);
  while (cursor.getTime() <= endDate.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor = new Date(cursor.getTime() + 24 * 3600 * 1000);
  }
  return dates;
}

/** Validates a schedDate is not in the past and not too far in the future. */
export function assertSchedulableDate(schedDate: string) {
  const today = myToday();
  if (schedDate < today) {
    throw new Error("不能安排过去的日期 Cannot schedule in the past");
  }
  if (schedDate > maxSchedulableDate()) {
    throw new Error(`只能安排 ${SCHEDULE_AHEAD_DAYS} 天以内的任务 Can only schedule within ${SCHEDULE_AHEAD_DAYS} days`);
  }
}
