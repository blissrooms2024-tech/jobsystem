import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { leaves } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";

const bodySchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reviewNote: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("boss", "admin", "supervisor");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const [existing] = await db.select().from(leaves).where(eq(leaves.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status !== "pending") {
    return NextResponse.json({ error: "Already reviewed" }, { status: 409 });
  }

  const [updated] = await db
    .update(leaves)
    .set({
      status: parsed.data.decision,
      reviewedBy: auth.session.user.id,
      reviewNote: parsed.data.reviewNote,
    })
    .where(eq(leaves.id, id))
    .returning();

  return NextResponse.json({ leave: updated });
}
