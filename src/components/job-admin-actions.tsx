"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function JobAdminActions({
  jobId,
  status,
  canDelete,
}: {
  jobId: string;
  status: string;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dupDate, setDupDate] = useState("");
  const [showDup, setShowDup] = useState(false);

  const call = (path: string, body?: unknown) => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/jobs/${jobId}${path}`, {
        method: path === "" ? "DELETE" : "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "操作失败 Action failed");
        return;
      }
      if (path === "/duplicate") {
        router.push(`/jobs/${data.job.id}`);
      } else if (path === "") {
        router.push("/jobs");
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-2 border-t border-neutral-200 pt-4">
      <p className="text-xs font-medium text-neutral-500">管理操作 Admin actions</p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        {status !== "assigned" ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (confirm("确定要把这个任务重开吗？打卡记录会被清空。\nReopen this job? Check-in data will be cleared.")) {
                call("/reopen");
              }
            }}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
          >
            重开 Reopen
          </button>
        ) : null}

        {showDup ? (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dupDate}
              onChange={(e) => setDupDate(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              disabled={isPending || !dupDate}
              onClick={() => call("/duplicate", { schedDate: dupDate })}
              className="rounded-md bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              确认复制 Confirm
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDup(true)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
          >
            复制 Duplicate
          </button>
        )}

        {canDelete ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (confirm("确定要删除这个任务吗？此操作无法撤销。\nDelete this job? This cannot be undone.")) {
                call("");
              }
            }}
            className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            删除 Delete
          </button>
        ) : null}
      </div>
    </div>
  );
}
