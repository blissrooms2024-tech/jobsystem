import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { leaves, users } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";

const bodySchema = z.object({
  decision: z.enum(["approved", "rejected", "cancelled"]),
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
  if (existing.userId === auth.session.user.id) {
    return NextResponse.json({ error: "不能审批自己的请假 You can't review your own request" }, { status: 403 });
  }
  if (auth.session.user.role === "supervisor") {
    const [applicant] = await db.select().from(users).where(eq(users.id, existing.userId)).limit(1);
    if (applicant?.supervisorId !== auth.session.user.id) {
      return NextResponse.json(
        { error: "只能审批自己团队的请假 You can only review your own team's requests" },
        { status: 403 },
      );
    }
  }

  // "cancelled" can void an already-approved leave, not just a pending one.
  const allowedFrom = parsed.data.decision === "cancelled" ? ["pending", "approved"] : ["pending"];
  if (!allowedFrom.includes(existing.status)) {
    return NextResponse.json({ error: "此请假已处理过 Already reviewed" }, { status: 409 });
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
