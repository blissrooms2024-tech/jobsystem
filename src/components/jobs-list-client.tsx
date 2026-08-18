"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney, cn } from "@/lib/utils";
import { matchesQuery } from "@/lib/search";
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [bulkError, setBulkError] = useState<string | null>(null);

  const filtered = useMemo(
    () => rows.filter((r) => matchesQuery([r.title, r.assigneeName, r.assigneeStaffId, r.unitName], search)),
    [rows, search],
  );

  const allFilteredSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  const toggleAll = () => {
    setSelected(allFilteredSelected ? new Set() : new Set(filtered.map((r) => r.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkDelete = () => {
    if (selected.size === 0) return;
    if (
      !confirm(
        t(`删除选中的 ${selected.size} 个任务？此操作无法撤销。`, `Delete ${selected.size} selected jobs? This can't be undone.`),
      )
    )
      return;
    setBulkError(null);
    startTransition(async () => {
      const ids = Array.from(selected);
      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
          return { id, ok: res.ok };
        }),
      );
      const failed = results.filter((r) => !r.ok).length;
      const succeeded = results.length - failed;
      setSelected(new Set());
      if (failed > 0) {
        setBulkError(
          t(
            `已删除 ${succeeded} 个，${failed} 个无法删除（可能已连结已发放工资）。`,
            `Deleted ${succeeded}, ${failed} couldn't be deleted (possibly linked to paid payroll).`,
          ),
        );
      }
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("搜索标题/负责人/单位...", "Search")}
          className="w-64 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
        />
        {canDelete && selected.size > 0 ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-neutral-500">
              <Bi zh={`已选 ${selected.size} 项`} en={`${selected.size} selected`} />
            </span>
            <button
              type="button"
              disabled={isPending}
              onClick={bulkDelete}
              className="rounded-md border border-red-200 px-3 py-1.5 text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              <Bi zh="删除选中" en="Delete selected" />
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="rounded-md border border-neutral-200 px-3 py-1.5 hover:bg-neutral-50"
            >
              <Bi zh="取消选择" en="Clear" />
            </button>
          </div>
        ) : null}
      </div>
      {bulkError ? <p className="text-sm text-red-600">{bulkError}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              {canDelete ? (
                <th className="w-8 px-3 py-2">
                  <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} aria-label={t("全选", "Select all")} />
                </th>
              ) : null}
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
                {canDelete ? (
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleOne(row.id)}
                      aria-label={t("选择", "Select")}
                    />
                  </td>
                ) : null}
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
                <td colSpan={(canDelete ? 1 : 0) + (isAdmin ? 7 : 6)} className="px-3 py-6 text-center text-neutral-400">
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
