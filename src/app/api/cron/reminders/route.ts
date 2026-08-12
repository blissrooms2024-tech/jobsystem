import { NextResponse } from "next/server";
import { runReminders } from "@/lib/reminders";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided =
    request.headers.get("x-cron-secret") ?? new URL(request.url).searchParams.get("secret");

  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("cron/reminders failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reminder job failed" },
      { status: 500 },
    );
  }
}
