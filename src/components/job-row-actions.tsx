"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function JobRowActions({
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

  const call = (method: "POST" | "DELETE", path: string, body?: unknown) => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/jobs/${jobId}${path}`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "操作失败 Failed");
        return;
      }
      router.refresh();
    });
  };

  const tomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {status !== "completed" && status !== "cancelled" ? (
        <button
          type="button"
          disabled={isPending}
          title="取消 Cancel"
          aria-label="取消 Cancel"
          onClick={() => {
            if (confirm("取消这个任务？")) call("POST", "/cancel");
          }}
          className="rounded-md border border-neutral-200 px-1.5 py-1 text-sm hover:bg-neutral-50"
        >
          🚫
        </button>
      ) : null}
      {status === "missed" || status === "cancelled" ? (
        <button
          type="button"
          disabled={isPending}
          title="重开 Reopen"
          aria-label="重开 Reopen"
          onClick={() => {
            if (confirm("重开这个任务？")) call("POST", "/reopen");
          }}
          className="rounded-md border border-neutral-200 px-1.5 py-1 text-sm hover:bg-neutral-50"
        >
          ↩️
        </button>
      ) : null}
      <button
        type="button"
        disabled={isPending}
        onClick={() => call("POST", "/duplicate", { schedDate: tomorrow() })}
        title="复制到明天 Duplicate to tomorrow"
        aria-label="复制到明天 Duplicate to tomorrow"
        className="rounded-md border border-neutral-200 px-1.5 py-1 text-sm hover:bg-neutral-50"
      >
        📋
      </button>
      {canDelete ? (
        <button
          type="button"
          disabled={isPending}
          title="删除 Delete"
          aria-label="删除 Delete"
          onClick={() => {
            if (confirm("删除这个任务？此操作无法撤销。")) call("DELETE", "");
          }}
          className="rounded-md border border-red-200 px-1.5 py-1 text-sm text-red-700 hover:bg-red-50"
        >
          🗑️
        </button>
      ) : null}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
