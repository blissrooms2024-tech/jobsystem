import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { payroll, users } from "@/db/schema";
import { formatMoney, cn } from "@/lib/utils";
import { DeletePayrollButton } from "@/components/delete-payroll-button";

export default async function PayrollListPage() {
  const session = await auth();
  const isAdmin = ["boss", "admin", "supervisor"].includes(session!.user.role);

  const rows = await db
    .select({
      id: payroll.id,
      payrollCode: payroll.payrollCode,
      employeeName: users.name,
      periodStart: payroll.periodStart,
      periodEnd: payroll.periodEnd,
      jobsPay: payroll.jobsPay,
      baseSalary: payroll.baseSalary,
      allowance: payroll.allowance,
      deduction: payroll.deduction,
      status: payroll.status,
    })
    .from(payroll)
    .innerJoin(users, eq(payroll.userId, users.id))
    .orderBy(desc(payroll.createdAt))
    .limit(200);

  // Historical record of how much was actually paid out, by month — grouped
  // on paidAt (when it was marked Paid), not the payslip's period.
  const monthlyPaid = await db
    .select({
      month: sql<string>`to_char(${payroll.paidAt}, 'YYYY-MM')`,
      count: sql<number>`count(*)`,
      total: sql<string>`sum(${payroll.jobsPay} + ${payroll.baseSalary} + ${payroll.allowance} - ${payroll.deduction})`,
    })
    .from(payroll)
    .where(eq(payroll.status, "paid"))
    .groupBy(sql`to_char(${payroll.paidAt}, 'YYYY-MM')`)
    .orderBy(desc(sql`to_char(${payroll.paidAt}, 'YYYY-MM')`))
    .limit(12);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">工资 Payroll</h1>
        <Link
          href="/payroll/generate"
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
        >
          + 生成工资单 Generate payslip
        </Link>
      </div>

      {monthlyPaid.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-neutral-200">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-500">
              <tr>
                <th className="px-3 py-2">月份 Month</th>
                <th className="px-3 py-2">工资单数 Payslips</th>
                <th className="px-3 py-2">已发放合计 Paid total</th>
              </tr>
            </thead>
            <tbody>
              {monthlyPaid.map((m) => (
                <tr key={m.month} className="border-t border-neutral-100">
                  <td className="px-3 py-2 font-medium">{m.month}</td>
                  <td className="px-3 py-2">{m.count}</td>
                  <td className="px-3 py-2">{formatMoney(m.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-3 py-2">编号 Code</th>
              <th className="px-3 py-2">员工 Employee</th>
              <th className="px-3 py-2">周期 Period</th>
              <th className="px-3 py-2">净额 Net</th>
              <th className="px-3 py-2">状态 Status</th>
              {isAdmin ? <th className="px-3 py-2">操作 Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const net =
                Number(r.jobsPay) + Number(r.baseSalary) + Number(r.allowance) - Number(r.deduction);
              return (
                <tr key={r.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                  <td className="px-3 py-2">
                    <Link href={`/payroll/${r.id}`}>{r.payrollCode}</Link>
                  </td>
                  <td className="px-3 py-2">{r.employeeName}</td>
                  <td className="px-3 py-2">
                    {r.periodStart} ~ {r.periodEnd}
                  </td>
                  <td className="px-3 py-2">{formatMoney(net)}</td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        r.status === "paid"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800",
                      )}
                    >
                      {r.status === "paid" ? "已发放 Paid" : "草稿 Draft"}
                    </span>
                  </td>
                  {isAdmin ? (
                    <td className="px-3 py-2">
                      {r.status === "draft" ? <DeletePayrollButton payrollId={r.id} /> : null}
                    </td>
                  ) : null}
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="px-3 py-6 text-center text-neutral-400">
                  暂无工资单 No payroll entries
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
