"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney, cn } from "@/lib/utils";
import { DeletePayrollButton } from "@/components/delete-payroll-button";
import { Bi } from "@/components/bi";
import { useLang } from "@/lib/use-lang";

type Row = {
  id: string;
  payrollCode: string;
  employeeName: string;
  periodStart: string;
  periodEnd: string;
  jobsPay: string;
  baseSalary: string;
  allowance: string;
  deduction: string;
  status: "draft" | "paid";
};

export function PayrollListClient({ rows, isAdmin }: { rows: Row[]; isAdmin: boolean }) {
  const router = useRouter();
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  const months = useMemo(() => {
    const set = new Set(rows.map((r) => r.periodStart.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (month && r.periodStart.slice(0, 7) !== month) return false;
      if (search && !r.employeeName.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, search, month]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("搜索员工姓名...", "Search employee")}
          className="w-56 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
        />
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
        >
          <option value="">全部月份 All months</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-3 py-2"><Bi zh="编号" en="Code" /></th>
              <th className="px-3 py-2"><Bi zh="员工" en="Employee" /></th>
              <th className="px-3 py-2"><Bi zh="周期" en="Period" /></th>
              <th className="px-3 py-2"><Bi zh="净额" en="Net" /></th>
              <th className="px-3 py-2"><Bi zh="状态" en="Status" /></th>
              <th className="px-3 py-2"><Bi zh="操作" en="Actions" /></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const net =
                Number(r.jobsPay) + Number(r.baseSalary) + Number(r.allowance) - Number(r.deduction);
              return (
                <tr
                  key={r.id}
                  onClick={() => router.push(`/payroll/${r.id}`)}
                  className="cursor-pointer border-t border-neutral-100 hover:bg-purple-50"
                >
                  <td className="px-3 py-2">
                    <Link href={`/payroll/${r.id}`} className="font-medium text-purple-700 hover:underline">
                      {r.payrollCode}
                    </Link>
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
                      <Bi zh={r.status === "paid" ? "已发放" : "草稿"} en={r.status === "paid" ? "Paid" : "Draft"} />
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/payroll/${r.id}`}
                        title={t("查看", "View")}
                        aria-label={t("查看", "View")}
                        className="rounded-md border border-neutral-200 px-1.5 py-1 text-sm hover:bg-white"
                      >
                        👁
                      </Link>
                      {isAdmin && r.status === "draft" ? <DeletePayrollButton payrollId={r.id} /> : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-neutral-400">
                  <Bi zh="没有符合的工资单" en="No matching payslips" />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
