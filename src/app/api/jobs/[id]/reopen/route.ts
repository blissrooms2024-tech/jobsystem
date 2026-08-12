import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { jobs, payroll } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("boss", "admin", "supervisor");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.status === "assigned") {
    return NextResponse.json({ error: "此任务还未完成 Job is not completed/missed" }, { status: 409 });
  }

  if (job.payrollId) {
    const [linkedPayroll] = await db
      .select()
      .from(payroll)
      .where(eq(payroll.id, job.payrollId))
      .limit(1);
    if (linkedPayroll?.status === "paid") {
      return NextResponse.json(
        { error: "此任务已计入已发放的工资单，不能重开 Already paid out, cannot reopen" },
        { status: 409 },
      );
    }
    if (linkedPayroll) {
      await db
        .update(payroll)
        .set({
          jobsCount: sql`${payroll.jobsCount} - 1`,
          jobsPay: sql`${payroll.jobsPay} - ${job.pay}`,
        })
        .where(eq(payroll.id, linkedPayroll.id));
    }
  }

  const [updated] = await db
    .update(jobs)
    .set({
      status: "assigned",
      checkInTime: null,
      checkInLat: null,
      checkInLon: null,
      checkInDist: null,
      checkOutTime: null,
      checkOutLat: null,
      checkOutLon: null,
      checkOutDist: null,
      payrollId: null,
      paidDate: null,
      reopened: true,
    })
    .where(eq(jobs.id, id))
    .returning();

  return NextResponse.json({ job: updated });
}
