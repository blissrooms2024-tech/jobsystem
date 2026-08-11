import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { auth } from "@/auth";
import { db } from "@/db";
import { payroll, users } from "@/db/schema";
import { renderPayslipPdf } from "@/lib/payslip-pdf";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [row] = await db
    .select({ payroll, employeeName: users.name })
    .from(payroll)
    .innerJoin(users, eq(payroll.userId, users.id))
    .where(eq(payroll.id, id))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isAdmin = ["boss", "admin", "supervisor"].includes(session.user.role);
  const isOwner = row.payroll.userId === session.user.id;
  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pdfBuffer = await renderPayslipPdf({
    payrollCode: row.payroll.payrollCode,
    employeeName: row.employeeName,
    periodStart: row.payroll.periodStart,
    periodEnd: row.payroll.periodEnd,
    jobsCount: row.payroll.jobsCount,
    jobsPay: row.payroll.jobsPay,
    baseSalary: row.payroll.baseSalary,
    allowance: row.payroll.allowance,
    deduction: row.payroll.deduction,
    note: row.payroll.note,
    paidAt: row.payroll.paidAt ? row.payroll.paidAt.toISOString().slice(0, 10) : null,
  });

  const blob = await put(`payroll/${row.payroll.payrollCode}.pdf`, pdfBuffer, {
    access: "public",
    contentType: "application/pdf",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  await db.update(payroll).set({ pdfUrl: blob.url }).where(eq(payroll.id, id));

  return NextResponse.redirect(blob.url);
}
