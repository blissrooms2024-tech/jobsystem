import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobs, units } from "@/db/schema";
import { haversineDistanceMeters } from "@/lib/geo";
import { assertWithinCheckinWindow, jobEndInstant } from "@/lib/job-timing";
import { parsePhotos } from "@/lib/photos";

const bodySchema = z.object({
  lat: z.number(),
  lon: z.number(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "无法获取定位 Could not read your location" }, { status: 400 });
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
      { error: "此任务当前状态不能打卡 This job cannot be checked into right now" },
      { status: 409 },
    );
  }

  try {
    assertWithinCheckinWindow(job);
  } catch (err) {
    // Only the "too late" case gets swept to Missed on the spot (mirrors the
    // legacy hourly sweep) — "too early" just asks the employee to wait.
    if (!job.reopened && Date.now() > jobEndInstant(job.schedDate, job.endTime)) {
      await db.update(jobs).set({ status: "missed" }).where(eq(jobs.id, id));
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Outside check-in window" },
      { status: 409 },
    );
  }

  const beforePhotos = parsePhotos(job.photos).filter((p) => p.kind === "before" || p.kind === "photo");
  if (beforePhotos.length < 1) {
    return NextResponse.json(
      { error: "请先上传至少 1 张打卡前照片 Please upload at least 1 photo before checking in" },
      { status: 400 },
    );
  }

  if (!job.unitId) {
    return NextResponse.json({ error: "此任务没有绑定单位 This job has no unit" }, { status: 409 });
  }
  const [unit] = await db.select().from(units).where(eq(units.id, job.unitId)).limit(1);
  if (!unit) {
    return NextResponse.json({ error: "找不到单位 Unit not found" }, { status: 409 });
  }
  if (unit.lat === 0 && unit.lon === 0) {
    return NextResponse.json(
      { error: "此单位还没设置 GPS，请联系管理员现场设置 This unit has no GPS set yet — ask an admin to set it on-site" },
      { status: 409 },
    );
  }

  const dist = haversineDistanceMeters(parsed.data.lat, parsed.data.lon, unit.lat, unit.lon);
  if (dist > unit.radiusM) {
    return NextResponse.json(
      {
        error: `距离太远 Too far from site — you are ~${Math.round(dist)}m from ${unit.unitName} (allowed ${unit.radiusM}m)`,
      },
      { status: 409 },
    );
  }

  await db
    .update(jobs)
    .set({
      status: "in_progress",
      checkInTime: new Date(),
      checkInLat: parsed.data.lat,
      checkInLon: parsed.data.lon,
      checkInDist: dist,
    })
    .where(eq(jobs.id, id));

  return NextResponse.json({ ok: true, distanceMeters: dist });
}
