import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { payroll } from "@/db/schema";
import { formatMoney, cn } from "@/lib/utils";
import { Bi } from "@/components/bi";

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
      <h1 className="text-lg font-semibold">
        <Bi zh="我的工资单" en="My payslips" />
      </h1>
      <div className="space-y-2">
        {rows.map((p) => {
          const net =
            Number(p.jobsPay) + Number(p.baseSalary) + Number(p.allowance) - Number(p.deduction);
          return (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50"
            >
              <Link href={`/payroll/${p.id}`} className="flex-1">
                <p className="font-medium">{p.payrollCode}</p>
                <p className="text-xs text-neutral-500">
                  {p.periodStart} ~ {p.periodEnd}
                </p>
              </Link>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-semibold">{formatMoney(net)}</p>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      p.status === "paid" ? "text-emerald-700" : "text-amber-700",
                    )}
                  >
                    <Bi zh={p.status === "paid" ? "已发放" : "草稿"} en={p.status === "paid" ? "Paid" : "Draft"} />
                  </span>
                </div>
                <a
                  href={`/api/payroll/${p.id}/pdf`}
                  title="下载 PDF Download PDF"
                  aria-label="下载 PDF Download PDF"
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm hover:bg-white"
                >
                  ⬇️
                </a>
              </div>
            </div>
          );
        })}
        {rows.length === 0 ? (
          <p className="text-sm text-neutral-400">
            <Bi zh="暂无工资单" en="No payslips yet" />
          </p>
        ) : null}
      </div>
    </div>
  );
}
