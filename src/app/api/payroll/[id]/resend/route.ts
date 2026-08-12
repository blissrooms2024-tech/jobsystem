import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payroll } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";
import { emailPayslip } from "@/lib/payroll-pdf";

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
  if (existing.status !== "paid") {
    return NextResponse.json({ error: "只能重发已发放的工资单 Can only resend a paid payslip" }, { status: 409 });
  }

  const result = await emailPayslip(id);
  if (!result?.employee.email) {
    return NextResponse.json({ error: "该员工没有邮箱 This employee has no email on file" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
