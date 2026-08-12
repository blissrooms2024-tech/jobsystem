"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bi } from "@/components/bi";
import { biText } from "@/lib/lang";

export function JobAdminActions({
  jobId,
  status,
  pay,
  hasPayroll,
  canDelete,
}: {
  jobId: string;
  status: string;
  pay: string;
  hasPayroll: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dupDate, setDupDate] = useState("");
  const [dupUntil, setDupUntil] = useState("");
  const [showDup, setShowDup] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const [payValue, setPayValue] = useState(pay);

  const call = (method: "POST" | "PATCH" | "DELETE", path: string, body?: unknown) => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/jobs/${jobId}${path}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "操作失败 Action failed");
        return;
      }
      if (path === "/duplicate") {
        router.push(data.count > 1 ? "/jobs" : `/jobs/${data.job.id}`);
      } else if (path === "") {
        router.push("/jobs");
      } else {
        setShowPay(false);
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-2 border-t border-neutral-200 pt-4">
      <p className="text-xs font-medium text-neutral-500">
        <Bi zh="管理操作" en="Admin actions" />
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        {status !== "completed" && status !== "cancelled" ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (confirm(biText("确定要取消这个任务吗？", "Cancel this job?"))) call("POST", "/cancel");
            }}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
          >
            <Bi zh="取消" en="Cancel" />
          </button>
        ) : null}

        {status === "missed" || status === "cancelled" ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (
                confirm(
                  biText(
                    "确定要把这个任务重开吗？打卡记录会被清空。",
                    "Reopen this job? Check-in data will be cleared.",
                  ),
                )
              ) {
                call("POST", "/reopen");
              }
            }}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
          >
            <Bi zh="重开" en="Reopen" />
          </button>
        ) : null}

        {!hasPayroll ? (
          showPay ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                value={payValue}
                onChange={(e) => setPayValue(e.target.value)}
                className="w-24 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                disabled={isPending}
                onClick={() => call("PATCH", "/pay", { pay: payValue })}
                className="rounded-md bg-purple-700 hover:bg-purple-800 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                <Bi zh="确认" en="Confirm" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowPay(true)}
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
            >
              <Bi zh="改金额" en="Edit pay" />
            </button>
          )
        ) : null}

        {showDup ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={dupDate}
              onChange={(e) => setDupDate(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
            <span className="text-xs text-neutral-500">
              <Bi zh="到" en="to" /> (<Bi zh="可选" en="optional" />)
            </span>
            <input
              type="date"
              value={dupUntil}
              onChange={(e) => setDupUntil(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            />
            <button
              type="button"
              disabled={isPending || !dupDate}
              onClick={() =>
                call("POST", "/duplicate", { schedDate: dupDate, untilDate: dupUntil || undefined })
              }
              className="rounded-md bg-purple-700 hover:bg-purple-800 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              <Bi zh="确认复制" en="Confirm" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDup(true)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50"
          >
            <Bi zh="复制" en="Duplicate" />
          </button>
        )}

        {canDelete ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (confirm(biText("确定要删除这个任务吗？此操作无法撤销。", "Delete this job? This cannot be undone."))) {
                call("DELETE", "");
              }
            }}
            className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            <Bi zh="删除" en="Delete" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
