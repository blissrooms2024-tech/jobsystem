import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobs, jobTypes, users } from "@/db/schema";
import { assertWithinCheckinWindow, jobEndInstant } from "@/lib/job-timing";
import { parsePhotos } from "@/lib/photos";

const bodySchema = z.object({
  lat: z.number().optional(),
  lon: z.number().optional(),
});

// One-step completion for jobs that don't require an on-site GPS check-in
// (e.g. Facebook posting, done from home) — mirrors the legacy sheet, where
// such jobs had identical CheckInTime and CheckOutTime timestamps. If the
// assignee's profile requires completion photos (DonePhotos > 0), that many
// must already be uploaded to the job.
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
  if (job.status !== "assigned") {
    return NextResponse.json(
      { error: "此任务当前状态不能完成 This job cannot be completed right now" },
      { status: 409 },
    );
  }

  try {
    assertWithinCheckinWindow(job);
  } catch (err) {
    if (!job.reopened && Date.now() > jobEndInstant(job.schedDate, job.endTime)) {
      await db.update(jobs).set({ status: "missed" }).where(eq(jobs.id, id));
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Outside completion window" },
      { status: 409 },
    );
  }

  const [assignee] = await db.select().from(users).where(eq(users.id, session.user.id)).limit(1);
  const need = assignee?.donePhotos ?? 0;
  if (need > 0) {
    const photoCount = parsePhotos(job.photos).length;
    if (photoCount < need) {
      return NextResponse.json(
        { error: `请先上传至少 ${need} 张照片 Please upload at least ${need} photos` },
        { status: 400 },
      );
    }
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
