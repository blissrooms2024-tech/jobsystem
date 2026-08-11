import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { payroll, users } from "@/db/schema";
import { formatMoney } from "@/lib/utils";
import { PayrollEditForm } from "@/components/payroll-edit-form";
import { MarkPaidButton } from "@/components/mark-paid-button";

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

  const isAdmin = ["boss", "admin", "supervisor"].includes(currentUser.role);
  const isOwner = row.payroll.userId === currentUser.id;
  if (!isAdmin && !isOwner) notFound();

  const p = row.payroll;
  const net = Number(p.jobsPay) + Number(p.baseSalary) + Number(p.allowance) - Number(p.deduction);
  const canEdit = isAdmin && p.status === "draft";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-xs text-neutral-400">{p.payrollCode}</p>
        <h1 className="text-lg font-semibold">{row.employee.name}</h1>
        <p className="text-sm text-neutral-500">
          {p.periodStart} ~ {p.periodEnd} · {p.status === "paid" ? "已发放 Paid" : "草稿 Draft"}
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 p-4 text-sm">
        <div className="flex justify-between py-1">
          <span className="text-neutral-500">已完成任务 Jobs completed</span>
          <span>{p.jobsCount}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-neutral-500">任务工资 Jobs pay</span>
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

      <div className="flex items-center justify-between border-t border-neutral-200 pt-4">
        <div>
          <p className="text-xs text-neutral-500">净额 Net pay</p>
          <p className="text-2xl font-semibold">{formatMoney(net)}</p>
        </div>
        <div className="flex gap-2">
          <a
            href={`/api/payroll/${p.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            下载 PDF Download PDF
          </a>
          {isAdmin && p.status === "draft" ? <MarkPaidButton payrollId={p.id} /> : null}
        </div>
      </div>
    </div>
  );
}
