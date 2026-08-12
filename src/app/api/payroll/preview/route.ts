import { NextResponse } from "next/server";
import { and, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { jobs, payroll, users } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";

const querySchema = z.object({
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// One row per active staff member (employee + supervisor) for the given
// period: live-computed job pay/count from completed-but-unlinked jobs, or
// the already-saved payslip for this exact period if one exists — a saved
// payslip's numbers are authoritative ("frozen") until explicitly re-saved,
// same as the legacy sheet's payroll preview.
export async function GET(request: Request) {
  const auth = await requireRole("boss", "admin", "supervisor");
  if ("error" in auth) return auth.error;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    periodStart: url.searchParams.get("periodStart"),
    periodEnd: url.searchParams.get("periodEnd"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }
  const { periodStart, periodEnd } = parsed.data;

  const staff = await db
    .select()
    .from(users)
    .where(and(eq(users.active, true), inArray(users.role, ["employee", "supervisor"])));

  const liveJobStats = await db
    .select({
      userId: jobs.assignedTo,
      jobsCount: sql<number>`count(*)`,
      jobsPay: sql<string>`coalesce(sum(${jobs.pay}), 0)`,
    })
    .from(jobs)
    .where(
      and(
        eq(jobs.status, "completed"),
        isNull(jobs.payrollId),
        gte(jobs.schedDate, periodStart),
        lte(jobs.schedDate, periodEnd),
      ),
    )
    .groupBy(jobs.assignedTo);
  const liveByUser = new Map(liveJobStats.map((r) => [r.userId, r]));

  const savedRows = await db
    .select()
    .from(payroll)
    .where(and(eq(payroll.periodStart, periodStart), eq(payroll.periodEnd, periodEnd)));
  const savedByUser = new Map(savedRows.map((r) => [r.userId, r]));

  const result = staff.map((u) => {
    const saved = savedByUser.get(u.id);
    const live = liveByUser.get(u.id);
    return {
      userId: u.id,
      name: u.name,
      staffId: u.staffId,
      staffType: u.staffType,
      icPassport: u.icPassport,
      payType: u.payType,
      payRate: u.payRate,
      bankName: u.bankName,
      bankAccount: u.bankAccount,
      jobsCount: saved ? saved.jobsCount : (live?.jobsCount ?? 0),
      jobsPay: saved ? saved.jobsPay : (live?.jobsPay ?? "0"),
      baseSalary: saved?.baseSalary ?? "0",
      allowance: saved?.allowance ?? "0",
      deduction: saved?.deduction ?? "0",
      note: saved?.note ?? "",
      payrollId: saved?.id ?? null,
      payrollCode: saved?.payrollCode ?? null,
      status: saved?.status ?? null,
      issuedDate: saved ? saved.createdAt.toISOString().slice(0, 10) : null,
      periodType: saved?.periodType ?? "custom",
    };
  });

  return NextResponse.json({ rows: result });
}
