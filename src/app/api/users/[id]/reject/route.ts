import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";

// A rejected signup has no jobs/payroll/chat history yet (it was never an
// active account), so there's nothing to preserve — just remove the row so
// the person can sign up again if it was a mistake.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("boss", "admin");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const [pending] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!pending || !pending.pendingApproval) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.delete(users).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}
