import { NextResponse } from "next/server";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
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

  // Stamp any completed, still-unlinked jobs for this user in the period as
  // paid by this payslip — matches the legacy system, which only ever links
  // jobs to a payslip at the moment it's marked Paid, not when it's saved.
  await db
    .update(jobs)
    .set({ payrollId: id, paidDate: now.toISOString().slice(0, 10) })
    .where(
      and(
        eq(jobs.assignedTo, existing.userId),
        eq(jobs.status, "completed"),
        isNull(jobs.payrollId),
        gte(jobs.schedDate, existing.periodStart),
        lte(jobs.schedDate, existing.periodEnd),
      ),
    );

  return NextResponse.json({ payroll: updated });
}
