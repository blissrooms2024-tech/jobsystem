import { NextResponse } from "next/server";
import { and, eq, gte, inArray, isNull, lte } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { jobs, payroll } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";
import { generatePayrollCode } from "@/lib/codes";
import { nextSequenceNumber } from "@/lib/sequence";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式不对，请用日期选择器选择 Please pick a valid date");

const bodySchema = z
  .object({
    userId: z.string().uuid({ message: "请选择员工 Please select an employee" }),
    periodStart: isoDate,
    periodEnd: isoDate,
    periodType: z.enum(["custom", "month"]).default("custom"),
    month: z.string().optional(),
  })
  .refine((data) => data.periodStart <= data.periodEnd, {
    message: "开始日期不能晚于结束日期 Period start must be before period end",
    path: ["periodEnd"],
  });

export async function POST(request: Request) {
  const auth = await requireRole("boss", "admin", "supervisor");
  if ("error" in auth) return auth.error;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const data = parsed.data;

  try {
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
  } catch (err) {
    console.error("payroll/generate failed", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "生成失败 Failed to generate" },
      { status: 500 },
    );
  }
}
