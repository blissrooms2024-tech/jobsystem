import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { jobTypes } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";

const bodySchema = z.object({
  typeName: z.string().min(1).optional(),
  active: z.boolean().optional(),
  pay: z.coerce.number().nonnegative().optional(),
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

  let updated;
  try {
    [updated] = await db
      .update(jobTypes)
      .set({
        ...(parsed.data.typeName !== undefined ? { typeName: parsed.data.typeName } : {}),
        ...(parsed.data.active !== undefined ? { active: parsed.data.active } : {}),
        ...(parsed.data.pay !== undefined ? { pay: parsed.data.pay.toFixed(2) } : {}),
      })
      .where(eq(jobTypes.id, id))
      .returning();
  } catch (err) {
    if (err instanceof Error && err.message.includes("unique")) {
      return NextResponse.json(
        { error: "已有同名工种 A job type with this name already exists" },
        { status: 409 },
      );
    }
    throw err;
  }

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ jobType: updated });
}
