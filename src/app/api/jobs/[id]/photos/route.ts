import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobs, users } from "@/db/schema";
import { MAX_COMPLETION_PHOTOS, parsePhotos, photoEntrySchema } from "@/lib/photos";

const bodySchema = z.object({
  url: photoEntrySchema.shape.url,
  kind: photoEntrySchema.shape.kind,
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
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const isOwner = job.assignedTo === session.user.id;
  const isFullAdmin = ["boss", "admin"].includes(session.user.role);
  let isOwnTeam = false;
  if (!isOwner && !isFullAdmin && session.user.role === "supervisor" && job.assignedTo) {
    const [assignee] = await db.select().from(users).where(eq(users.id, job.assignedTo)).limit(1);
    isOwnTeam = assignee?.supervisorId === session.user.id;
  }
  if (!isOwner && !isFullAdmin && !isOwnTeam) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = parsePhotos(job.photos);

  // Completion photos (proof-of-work for no-checkin staff) are capped at
  // MAX_COMPLETION_PHOTOS per job — otherwise unlimited re-uploads. Before/
  // after comparison shots are unaffected (already capped at one each by
  // the UI only offering one slot per kind).
  if (
    parsed.data.kind === "photo" &&
    existing.filter((p) => p.kind === "photo").length >= MAX_COMPLETION_PHOTOS
  ) {
    return NextResponse.json(
      {
        error: `最多只能上传 ${MAX_COMPLETION_PHOTOS} 张照片 You can upload at most ${MAX_COMPLETION_PHOTOS} photos`,
      },
      { status: 409 },
    );
  }

  const nextIdx = existing.filter((p) => p.kind === parsed.data.kind).length;
  const updated = [...existing, { ...parsed.data, idx: nextIdx }];

  await db.update(jobs).set({ photos: updated }).where(eq(jobs.id, id));

  return NextResponse.json({ photos: updated });
}
