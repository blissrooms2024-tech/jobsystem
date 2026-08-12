"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatMoney, cn } from "@/lib/utils";
import { JOB_STATUS_LABEL, JOB_STATUS_STYLE } from "@/lib/job-status";
import { JobRowActions } from "@/components/job-row-actions";

type Row = {
  id: string;
  jobCode: string;
  title: string;
  status: string;
  schedDate: string;
  pay: string;
  unitName: string | null;
  assigneeName: string | null;
};

export function JobsListClient({
  rows,
  isAdmin,
  canDelete,
}: {
  rows: Row[];
  isAdmin: boolean;
  canDelete: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.title, r.assigneeName, r.unitName].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索标题/负责人/单位... Search"
        className="w-64 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
      />

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-3 py-2">日期 Date</th>
              <th className="px-3 py-2">标题 Title</th>
              {isAdmin ? <th className="px-3 py-2">负责人 Assignee</th> : null}
              <th className="px-3 py-2">单位 Unit</th>
              <th className="px-3 py-2">状态 Status</th>
              <th className="px-3 py-2">工资 Pay</th>
              {isAdmin ? <th className="px-3 py-2">操作 Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="px-3 py-2">
                  <Link href={`/jobs/${row.id}`} className="block">
                    {row.schedDate}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/jobs/${row.id}`} className="block font-medium">
                    {row.title}
                  </Link>
                </td>
                {isAdmin ? <td className="px-3 py-2">{row.assigneeName ?? "-"}</td> : null}
                <td className="px-3 py-2">{row.unitName ?? "-"}</td>
                <td className="px-3 py-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", JOB_STATUS_STYLE[row.status])}>
                    {JOB_STATUS_LABEL[row.status]}
                  </span>
                </td>
                <td className="px-3 py-2">{formatMoney(row.pay)}</td>
                {isAdmin ? (
                  <td className="px-3 py-2">
                    <JobRowActions jobId={row.id} status={row.status} canDelete={canDelete} />
                  </td>
                ) : null}
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 5} className="px-3 py-6 text-center text-neutral-400">
                  没有符合的任务 No matching jobs
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
