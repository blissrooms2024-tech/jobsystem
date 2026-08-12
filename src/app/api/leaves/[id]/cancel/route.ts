import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { leaves } from "@/db/schema";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [existing] = await db.select().from(leaves).where(eq(leaves.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.userId !== session.user.id) {
    return NextResponse.json({ error: "只能取消自己的申请 You can only cancel your own request" }, { status: 403 });
  }
  if (existing.status === "cancelled") {
    return NextResponse.json({ error: "已经取消了 Already cancelled" }, { status: 409 });
  }

  const [updated] = await db
    .update(leaves)
    .set({
      status: "cancelled",
      reviewNote: existing.reviewNote ? `${existing.reviewNote} · cancelled by staff` : "cancelled by staff",
    })
    .where(eq(leaves.id, id))
    .returning();

  return NextResponse.json({ leave: updated });
}
