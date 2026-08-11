import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { jobs, payroll } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("boss", "admin");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const [existing] = await db.select().from(payroll).where(eq(payroll.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status === "paid") {
    return NextResponse.json({ error: "Already paid" }, { status: 409 });
  }

  const now = new Date();
  const [updated] = await db
    .update(payroll)
    .set({ status: "paid", paidAt: now })
    .where(eq(payroll.id, id))
    .returning();

  await db.update(jobs).set({ paidDate: now.toISOString().slice(0, 10) }).where(eq(jobs.payrollId, id));

  return NextResponse.json({ payroll: updated });
}
