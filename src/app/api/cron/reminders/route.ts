import { NextResponse } from "next/server";
import { runReminders, sendPayrollReminder, sweepInactiveUsers, sweepMissedJobs } from "@/lib/reminders";

export const runtime = "nodejs";
export const maxDuration = 60;

// Each step is isolated — one broken step (e.g. a migration that hasn't
// been run against the DB yet) shouldn't 500 the whole endpoint and fail
// the other, unrelated steps that already succeeded, and shouldn't trip a
// "workflow failed" email every 30 minutes for something already logged.
async function runStep<T>(name: string, fn: () => Promise<T>): Promise<T | { error: string }> {
  try {
    return await fn();
  } catch (err) {
    console.error(`cron/reminders: ${name} failed`, err);
    return { error: err instanceof Error ? err.message : "Step failed" };
  }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.headers.get("x-cron-secret") ?? new URL(request.url).searchParams.get("secret");

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const missed = await runStep("sweepMissedJobs", sweepMissedJobs);
  const deactivated = await runStep("sweepInactiveUsers", sweepInactiveUsers);
  const reminders = await runStep("runReminders", runReminders);
  const payroll = await runStep("sendPayrollReminder", sendPayrollReminder);

  return NextResponse.json({ ok: true, missed, deactivated, reminders, payroll });
}
