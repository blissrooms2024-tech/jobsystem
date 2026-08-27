import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { resources } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";

const bodySchema = z.object({
  type: z.enum(["guideline", "tutorial", "contact", "drive_link"]).optional(),
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  url: z.string().optional(),
  unitIds: z.array(z.string().uuid()).nullable().optional(),
  staffType: z.string().nullable().optional(),
  userId: z.string().uuid().nullable().optional(),
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
    .update(resources)
    .set({
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.content !== undefined ? { content: data.content || null } : {}),
      ...(data.url !== undefined ? { url: data.url || null } : {}),
      ...(data.unitIds !== undefined ? { unitIds: data.unitIds?.length ? data.unitIds : null } : {}),
      ...(data.staffType !== undefined ? { staffType: data.staffType || null } : {}),
      ...(data.userId !== undefined ? { userId: data.userId } : {}),
      updatedAt: new Date(),
    })
    .where(eq(resources.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ resource: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("boss", "admin");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  await db.delete(resources).where(eq(resources.id, id));
  return NextResponse.json({ ok: true });
}
