import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { parsePhotos, photoEntrySchema } from "@/lib/photos";

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
  const isAdmin = ["boss", "admin", "supervisor"].includes(session.user.role);
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = parsePhotos(job.photos);
  const nextIdx = existing.filter((p) => p.kind === parsed.data.kind).length;
  const updated = [...existing, { ...parsed.data, idx: nextIdx }];

  await db.update(jobs).set({ photos: updated }).where(eq(jobs.id, id));

  return NextResponse.json({ photos: updated });
}
