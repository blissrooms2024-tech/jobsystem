"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney, cn } from "@/lib/utils";
import { JOB_STATUS_LABEL, JOB_STATUS_STYLE } from "@/lib/job-status";
import { JobRowActions } from "@/components/job-row-actions";
import { Bi } from "@/components/bi";
import { useLang } from "@/lib/use-lang";

type Row = {
  id: string;
  jobCode: string;
  title: string;
  status: string;
  schedDate: string;
  pay: string;
  unitName: string | null;
  assigneeName: string | null;
  assigneeStaffId: string | null;
  assigneeUserCode: string | null;
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
  const router = useRouter();
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.title, r.assigneeName, r.assigneeStaffId, r.unitName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("搜索标题/负责人/单位...", "Search")}
        className="w-64 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
      />

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-3 py-2"><Bi zh="日期" en="Date" /></th>
              <th className="px-3 py-2"><Bi zh="标题" en="Title" /></th>
              {isAdmin ? <th className="px-3 py-2"><Bi zh="负责人" en="Assignee" /></th> : null}
              <th className="px-3 py-2"><Bi zh="单位" en="Unit" /></th>
              <th className="px-3 py-2"><Bi zh="状态" en="Status" /></th>
              <th className="px-3 py-2"><Bi zh="工资" en="Pay" /></th>
              <th className="px-3 py-2"><Bi zh="操作" en="Actions" /></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={row.id}
                onClick={() => router.push(`/jobs/${row.id}`)}
                className="cursor-pointer border-t border-neutral-100 hover:bg-purple-50"
              >
                <td className="px-3 py-2 text-neutral-500">{row.schedDate}</td>
                <td className="px-3 py-2 font-medium text-purple-700">{row.title}</td>
                {isAdmin ? (
                  <td className="px-3 py-2">
                    {row.assigneeName ? (
                      <>
                        <span className="text-xs text-neutral-400">
                          {row.assigneeStaffId ?? row.assigneeUserCode}
                        </span>{" "}
                        {row.assigneeName}
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                ) : null}
                <td className="px-3 py-2">{row.unitName ?? "-"}</td>
                <td className="px-3 py-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", JOB_STATUS_STYLE[row.status])}>
                    <Bi zh={JOB_STATUS_LABEL[row.status].zh} en={JOB_STATUS_LABEL[row.status].en} />
                  </span>
                </td>
                <td className="px-3 py-2">{formatMoney(row.pay)}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div onClick={(e) => e.stopPropagation()}>
                    {isAdmin ? (
                      <JobRowActions jobId={row.id} status={row.status} canDelete={canDelete} />
                    ) : (
                      <Link
                        href={`/jobs/${row.id}`}
                        title={t("查看", "View")}
                        aria-label={t("查看", "View")}
                        className="rounded-md border border-neutral-200 px-1.5 py-1 text-sm hover:bg-white"
                      >
                        👁
                      </Link>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="px-3 py-6 text-center text-neutral-400">
                  <Bi zh="没有符合的任务" en="No matching jobs" />
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
