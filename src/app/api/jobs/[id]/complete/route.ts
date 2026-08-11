import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobs, jobTypes } from "@/db/schema";

const bodySchema = z.object({
  lat: z.number().optional(),
  lon: z.number().optional(),
});

// One-step completion for jobs that don't require an on-site GPS check-in
// (e.g. Facebook posting, done from home) — mirrors the legacy sheet, where
// such jobs had identical CheckInTime and CheckOutTime timestamps.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.assignedTo !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (job.status === "completed") {
    return NextResponse.json({ error: "Already completed" }, { status: 409 });
  }

  let pay = job.pay;
  if ((!pay || Number(pay) === 0) && job.jobTypeId) {
    const [jt] = await db.select().from(jobTypes).where(eq(jobTypes.id, job.jobTypeId)).limit(1);
    if (jt) pay = jt.pay;
  }

  const now = new Date();
  await db
    .update(jobs)
    .set({
      checkInTime: job.checkInTime ?? now,
      checkInLat: job.checkInLat ?? parsed.data.lat ?? null,
      checkInLon: job.checkInLon ?? parsed.data.lon ?? null,
      checkOutTime: now,
      checkOutLat: parsed.data.lat ?? null,
      checkOutLon: parsed.data.lon ?? null,
      status: "completed",
      pay,
    })
    .where(eq(jobs.id, id));

  return NextResponse.json({ ok: true });
}
