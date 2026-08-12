import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { payroll } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";
import { generatePayrollCode } from "@/lib/codes";
import { insertWithNextCode } from "@/lib/sequence";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const bodySchema = z.object({
  userId: z.string().uuid(),
  periodStart: isoDate,
  periodEnd: isoDate,
  periodType: z.enum(["custom", "month"]).default("custom"),
  jobsCount: z.coerce.number().int().nonnegative(),
  jobsPay: z.coerce.number().nonnegative(),
  baseSalary: z.coerce.number().nonnegative(),
  allowance: z.coerce.number().nonnegative(),
  deduction: z.coerce.number().nonnegative(),
  note: z.string().optional(),
});

// Upserts one staff member's payslip for a period — this is what the batch
// preview table calls per-row "Save". Numbers are trusted as entered (the
// admin may hand-adjust jobsCount/jobsPay away from the live total); job
// records only get linked to this payslip later, when it's marked Paid.
export async function POST(request: Request) {
  const auth = await requireRole("boss", "admin");
  if ("error" in auth) return auth.error;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const data = parsed.data;

  const [existing] = await db
    .select()
    .from(payroll)
    .where(
      and(
        eq(payroll.userId, data.userId),
        eq(payroll.periodStart, data.periodStart),
        eq(payroll.periodEnd, data.periodEnd),
      ),
    )
    .limit(1);

  if (existing?.status === "paid") {
    return NextResponse.json({ error: "已发放的工资单不能编辑 A paid payslip can't be edited" }, { status: 409 });
  }

  const values = {
    jobsCount: data.jobsCount,
    jobsPay: data.jobsPay.toFixed(2),
    baseSalary: data.baseSalary.toFixed(2),
    allowance: data.allowance.toFixed(2),
    deduction: data.deduction.toFixed(2),
    note: data.note || null,
  };

  if (existing) {
    const [updated] = await db
      .update(payroll)
      .set(values)
      .where(eq(payroll.id, existing.id))
      .returning();
    return NextResponse.json({ payroll: updated });
  }

  const created = await insertWithNextCode(
    "payroll",
    async (payrollCode) => {
      const [row] = await db
        .insert(payroll)
        .values({
          ...values,
          payrollCode,
          userId: data.userId,
          month: data.periodStart.slice(0, 7) + "-01",
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
          periodType: data.periodType,
          createdBy: auth.session.user.id,
          status: "draft",
        })
        .returning();
      return row;
    },
    generatePayrollCode,
  );

  return NextResponse.json({ payroll: created }, { status: 201 });
}
