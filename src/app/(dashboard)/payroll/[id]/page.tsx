import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { payroll, users } from "@/db/schema";
import { formatMoney } from "@/lib/utils";
import { generatedAtStamp } from "@/lib/payroll-pdf";
import { PayrollEditForm } from "@/components/payroll-edit-form";
import { PayslipPreviewToggle } from "@/components/payslip-preview-toggle";
import { MarkPaidButton } from "@/components/mark-paid-button";
import { UnpayButton } from "@/components/unpay-button";
import { ResendPayslipButton } from "@/components/resend-payslip-button";
import { DeletePayrollButton } from "@/components/delete-payroll-button";
import { Bi } from "@/components/bi";

export default async function PayrollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const currentUser = session!.user;

  const [row] = await db
    .select({ payroll, employee: users })
    .from(payroll)
    .innerJoin(users, eq(payroll.userId, users.id))
    .where(eq(payroll.id, id))
    .limit(1);

  if (!row) notFound();

  const isAdmin = ["boss", "admin"].includes(currentUser.role);
  const isOwner = row.payroll.userId === currentUser.id;
  if (!isAdmin && !isOwner) notFound();

  const p = row.payroll;
  const net = Number(p.jobsPay) + Number(p.baseSalary) + Number(p.allowance) - Number(p.deduction);
  const canEdit = isAdmin && p.status === "draft";

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="text-xs text-neutral-400">{p.payrollCode}</p>
        <h1 className="text-lg font-semibold">
          <span className="text-sm font-normal text-neutral-400">
            {row.employee.staffId ?? row.employee.userCode}
          </span>{" "}
          {row.employee.name}
        </h1>
        <p className="text-sm text-neutral-500">
          {p.periodStart} ~ {p.periodEnd} ·{" "}
          <Bi zh={p.status === "paid" ? "已发放" : "草稿"} en={p.status === "paid" ? "Paid" : "Draft"} />
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 p-4 text-sm">
        <div className="flex justify-between py-1">
          <span className="text-neutral-500"><Bi zh="已完成任务" en="Jobs completed" /></span>
          <span>{p.jobsCount}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-neutral-500"><Bi zh="任务工资" en="Jobs pay" /></span>
          <span>{formatMoney(p.jobsPay)}</span>
        </div>
      </div>

      <PayrollEditForm
        payrollId={p.id}
        baseSalary={p.baseSalary}
        allowance={p.allowance}
        deduction={p.deduction}
        note={p.note}
        editable={canEdit}
      />

      <div className="space-y-4 border-t border-neutral-200 pt-4">
        <div>
          <p className="text-xs text-neutral-500"><Bi zh="净额" en="Net pay" /></p>
          <p className="text-2xl font-semibold">{formatMoney(net)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PayslipPreviewToggle
            data={{
              payrollCode: p.payrollCode,
              employeeName: row.employee.name,
              staffId: row.employee.staffId,
              staffType: row.employee.staffType,
              icPassport: row.employee.icPassport,
              bankName: row.employee.bankName,
              bankAccount: row.employee.bankAccount,
              periodStart: p.periodStart,
              periodEnd: p.periodEnd,
              periodType: p.periodType,
              issuedDate: p.createdAt.toISOString().slice(0, 10),
              jobsCount: p.jobsCount,
              jobsPay: p.jobsPay,
              baseSalary: p.baseSalary,
              allowance: p.allowance,
              deduction: p.deduction,
              note: p.note,
              status: p.status,
              paidAt: p.paidAt ? p.paidAt.toISOString().slice(0, 10) : null,
              generatedAt: generatedAtStamp(),
            }}
          />
          <a
            href={`/api/payroll/${p.id}/pdf`}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium whitespace-nowrap hover:bg-neutral-50"
          >
            <Bi zh="下载 PDF" en="Download PDF" />
          </a>
          {isAdmin && p.status === "draft" ? <MarkPaidButton payrollId={p.id} /> : null}
          {isAdmin && p.status === "paid" ? <ResendPayslipButton payrollId={p.id} /> : null}
          {isAdmin && p.status === "paid" ? <UnpayButton payrollId={p.id} /> : null}
          {isAdmin && p.status === "draft" ? (
            <DeletePayrollButton payrollId={p.id} redirectTo="/payroll" />
          ) : null}
        </div>
      </div>
    </div>
  );
}
