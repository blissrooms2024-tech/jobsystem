import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";

const bodySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  videoUrl: z.string().min(1).optional(),
  jobTypeId: z.string().uuid().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("boss", "admin");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const data = parsed.data;

  const [updated] = await db
    .update(courses)
    .set({
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
      ...(data.videoUrl !== undefined ? { videoUrl: data.videoUrl } : {}),
      ...(data.jobTypeId !== undefined ? { jobTypeId: data.jobTypeId } : {}),
    })
    .where(eq(courses.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ course: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("boss", "admin");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  await db.delete(courses).where(eq(courses.id, id));
  return NextResponse.json({ ok: true });
}
