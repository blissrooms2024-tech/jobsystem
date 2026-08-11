import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { payroll } from "@/db/schema";
import { formatMoney, cn } from "@/lib/utils";

export default async function MyPayrollPage() {
  const session = await auth();
  const userId = session!.user.id;

  const rows = await db
    .select()
    .from(payroll)
    .where(eq(payroll.userId, userId))
    .orderBy(desc(payroll.createdAt))
    .limit(100);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">我的工资单 My payslips</h1>
      <div className="space-y-2">
        {rows.map((p) => {
          const net =
            Number(p.jobsPay) + Number(p.baseSalary) + Number(p.allowance) - Number(p.deduction);
          return (
            <Link
              key={p.id}
              href={`/payroll/${p.id}`}
              className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50"
            >
              <div>
                <p className="font-medium">{p.payrollCode}</p>
                <p className="text-xs text-neutral-500">
                  {p.periodStart} ~ {p.periodEnd}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatMoney(net)}</p>
                <span
                  className={cn(
                    "text-xs font-medium",
                    p.status === "paid" ? "text-emerald-700" : "text-amber-700",
                  )}
                >
                  {p.status === "paid" ? "已发放 Paid" : "草稿 Draft"}
                </span>
              </div>
            </Link>
          );
        })}
        {rows.length === 0 ? (
          <p className="text-sm text-neutral-400">暂无工资单 No payslips yet</p>
        ) : null}
      </div>
    </div>
  );
}
