import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobs, units } from "@/db/schema";
import { haversineDistanceMeters } from "@/lib/geo";

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
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.assignedTo !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (job.checkInTime) {
    return NextResponse.json({ error: "Already checked in" }, { status: 409 });
  }

  let dist: number | null = null;
  if (job.unitId) {
    const [unit] = await db.select().from(units).where(eq(units.id, job.unitId)).limit(1);
    if (unit) {
      dist = haversineDistanceMeters(parsed.data.lat, parsed.data.lon, unit.lat, unit.lon);
    }
  }

  await db
    .update(jobs)
    .set({
      checkInTime: new Date(),
      checkInLat: parsed.data.lat,
      checkInLon: parsed.data.lon,
      checkInDist: dist,
    })
    .where(eq(jobs.id, id));

  return NextResponse.json({ ok: true, distanceMeters: dist });
}
