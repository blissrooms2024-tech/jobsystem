"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Bi } from "@/components/bi";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-neutral-200 text-neutral-600",
};
const STATUS_LABEL: Record<string, { zh: string; en: string }> = {
  pending: { zh: "待审批", en: "Pending" },
  approved: { zh: "已批准", en: "Approved" },
  rejected: { zh: "已拒绝", en: "Rejected" },
  cancelled: { zh: "已取消", en: "Cancelled" },
};

type Row = {
  id: string;
  leaveCode: string;
  type: string;
  startDate: string;
  endDate: string;
  days: string;
  status: string;
  employeeName: string;
};

export function LeavesListClient({ rows, isAdmin }: { rows: Row[]; isAdmin: boolean }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => [r.employeeName, r.type].some((v) => v.toLowerCase().includes(q)));
  }, [rows, search]);

  return (
    <div className="space-y-3">
      {isAdmin ? (
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索员工姓名/类型... Search"
          className="w-64 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
        />
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              {isAdmin ? <th className="px-3 py-2"><Bi zh="员工" en="Employee" /></th> : null}
              <th className="px-3 py-2"><Bi zh="类型" en="Type" /></th>
              <th className="px-3 py-2"><Bi zh="日期" en="Dates" /></th>
              <th className="px-3 py-2"><Bi zh="天数" en="Days" /></th>
              <th className="px-3 py-2"><Bi zh="状态" en="Status" /></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                {isAdmin ? (
                  <td className="px-3 py-2">
                    <Link href={`/leaves/${r.id}`}>{r.employeeName}</Link>
                  </td>
                ) : null}
                <td className="px-3 py-2">
                  <Link href={`/leaves/${r.id}`} className="block">
                    {r.type}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {r.startDate} ~ {r.endDate}
                </td>
                <td className="px-3 py-2">{r.days}</td>
                <td className="px-3 py-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLE[r.status])}>
                    <Bi zh={STATUS_LABEL[r.status].zh} en={STATUS_LABEL[r.status].en} />
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="px-3 py-6 text-center text-neutral-400">
                  <Bi zh="没有符合的请假记录" en="No matching leave requests" />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
