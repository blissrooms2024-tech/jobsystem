import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { jobs, payroll } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("boss", "admin");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (job.payrollId) {
    const [linkedPayroll] = await db
      .select()
      .from(payroll)
      .where(eq(payroll.id, job.payrollId))
      .limit(1);
    if (linkedPayroll?.status === "paid") {
      return NextResponse.json(
        { error: "此任务已计入已发放的工资单，不能删除 Already paid out, cannot delete" },
        { status: 409 },
      );
    }
    if (linkedPayroll) {
      // Keep the still-draft payslip's totals honest — pull this job's pay
      // back out before the row disappears.
      await db
        .update(payroll)
        .set({
          jobsCount: sql`${payroll.jobsCount} - 1`,
          jobsPay: sql`${payroll.jobsPay} - ${job.pay}`,
        })
        .where(eq(payroll.id, linkedPayroll.id));
    }
  }

  await db.delete(jobs).where(eq(jobs.id, id));
  return NextResponse.json({ ok: true });
}
