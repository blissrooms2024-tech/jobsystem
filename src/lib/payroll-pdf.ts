import { eq } from "drizzle-orm";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { payroll, users } from "@/db/schema";
import { renderPayslipPdf } from "@/lib/payslip-pdf";
import { sendMail } from "@/lib/mailer";

function appUrl() {
  return process.env.APP_URL?.replace(/\/$/, "") ?? "";
}

/**
 * Renders the payslip PDF for a payroll row and uploads it to Blob storage
 * as a private object (the project's Blob store is configured private — a
 * `public` put() against it fails outright). The blob is kept only as a
 * record via pdfUrl; nothing serves it by redirecting to that URL, since a
 * private blob isn't fetchable without a signed request. Actual viewing /
 * downloading happens by streaming pdfBuffer straight from our own route.
 */
export async function generateAndStorePayslipPdf(payrollId: string) {
  const [row] = await db
    .select({ payroll, employee: users })
    .from(payroll)
    .innerJoin(users, eq(payroll.userId, users.id))
    .where(eq(payroll.id, payrollId))
    .limit(1);

  if (!row) return null;

  const pdfBuffer = await renderPayslipPdf({
    payrollCode: row.payroll.payrollCode,
    employeeName: row.employee.name,
    staffType: row.employee.staffType,
    icPassport: row.employee.icPassport,
    bankName: row.employee.bankName,
    bankAccount: row.employee.bankAccount,
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
    access: "private",
    contentType: "application/pdf",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  await db.update(payroll).set({ pdfUrl: blob.url }).where(eq(payroll.id, payrollId));

  return { pdfBuffer, blobUrl: blob.url, payroll: row.payroll, employee: row.employee };
}

/**
 * Regenerates the payslip PDF and emails it to the employee. Used both
 * right after marking a payslip paid, and for an admin-triggered resend
 * (e.g. the employee says they never got the original email).
 */
export async function emailPayslip(payrollId: string) {
  const result = await generateAndStorePayslipPdf(payrollId);
  if (!result?.employee.email) return result;

  const net =
    Number(result.payroll.jobsPay) +
    Number(result.payroll.baseSalary) +
    Number(result.payroll.allowance) -
    Number(result.payroll.deduction);

  const viewLink = appUrl() ? `${appUrl()}/payroll/${payrollId}` : null;

  await sendMail({
    to: result.employee.email,
    subject: `工资单 Payslip ${result.payroll.payrollCode} (${result.payroll.periodStart} ~ ${result.payroll.periodEnd})`,
    html: `
      <p>Hi ${result.employee.name},</p>
      <p>你 ${result.payroll.periodStart} 至 ${result.payroll.periodEnd} 的工资单已发放，净额 RM ${net.toFixed(2)}，详情见附件。</p>
      <p>Your payslip for ${result.payroll.periodStart} to ${result.payroll.periodEnd} has been paid — net RM ${net.toFixed(2)}. See the attached PDF for details.</p>
      ${viewLink ? `<p><a href="${viewLink}">查看工资单 View payslip</a></p>` : ""}
    `,
    attachments: [
      { filename: `${result.payroll.payrollCode}.pdf`, content: result.pdfBuffer, contentType: "application/pdf" },
    ],
  });

  return result;
}
