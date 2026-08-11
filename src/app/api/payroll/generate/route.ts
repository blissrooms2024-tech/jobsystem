import { NextResponse } from "next/server";
import { and, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { jobs, payroll } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";
import { generatePayrollCode } from "@/lib/codes";
import { nextSequenceNumber } from "@/lib/sequence";

const bodySchema = z.object({
  userId: z.string().uuid(),
  periodStart: z.string(),
  periodEnd: z.string(),
  periodType: z.enum(["custom", "month"]).default("custom"),
  month: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireRole("boss", "admin", "supervisor");
  if ("error" in auth) return auth.error;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const unassignedCompletedJobs = await db
    .select()
    .from(jobs)
    .where(
      and(
        eq(jobs.assignedTo, data.userId),
        eq(jobs.status, "completed"),
        isNull(jobs.payrollId),
        gte(jobs.schedDate, data.periodStart),
        lte(jobs.schedDate, data.periodEnd),
      ),
    );

  const jobsCount = unassignedCompletedJobs.length;
  const jobsPay = unassignedCompletedJobs
    .reduce((sum, j) => sum + Number(j.pay), 0)
    .toFixed(2);

  const seq = await nextSequenceNumber(payroll, payroll.payrollCode, 1);
  const payrollCode = generatePayrollCode(seq);

  const [created] = await db
    .insert(payroll)
    .values({
      payrollCode,
      userId: data.userId,
      month: data.month,
      jobsCount,
      jobsPay,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      periodType: data.periodType,
      createdBy: auth.session.user.id,
      status: "draft",
    })
    .returning();

  if (jobsCount > 0) {
    await db
      .update(jobs)
      .set({ payrollId: created.id })
      .where(inArray(jobs.id, unassignedCompletedJobs.map((j) => j.id)));
  }

  return NextResponse.json({ payroll: created }, { status: 201 });
}
