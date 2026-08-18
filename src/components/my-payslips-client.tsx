"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatMoney, cn } from "@/lib/utils";
import { Bi } from "@/components/bi";
import { PayslipDownloadLink } from "@/components/payslip-download-link";
import { useLang } from "@/lib/use-lang";
import { matchesQuery } from "@/lib/search";

type Row = {
  id: string;
  payrollCode: string;
  periodStart: string;
  periodEnd: string;
  jobsPay: string;
  baseSalary: string;
  allowance: string;
  deduction: string;
  status: "draft" | "paid";
};

export function MyPayslipsClient({ rows }: { rows: Row[] }) {
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
      if (!matchesQuery([r.payrollCode], search)) return false;
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
          placeholder={t("搜索编号...", "Search code")}
          className="w-48 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
        />
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
        >
          <option value="">{t("全部月份", "All months")}</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {filtered.map((p) => {
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
                <PayslipDownloadLink payrollId={p.id} />
              </div>
            </div>
          );
        })}
        {filtered.length === 0 ? (
          <p className="text-sm text-neutral-400">
            <Bi zh="没有符合的工资单" en="No matching payslips" />
          </p>
        ) : null}
      </div>
    </div>
  );
}
