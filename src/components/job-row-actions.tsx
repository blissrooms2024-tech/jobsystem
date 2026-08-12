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
    <div className="flex flex-wrap items-center gap-1.5">
      {status !== "completed" && status !== "cancelled" ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (confirm("取消这个任务？")) call("POST", "/cancel");
          }}
          className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
        >
          取消
        </button>
      ) : null}
      {status === "missed" || status === "cancelled" ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (confirm("重开这个任务？")) call("POST", "/reopen");
          }}
          className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
        >
          重开
        </button>
      ) : null}
      <button
        type="button"
        disabled={isPending}
        onClick={() => call("POST", "/duplicate", { schedDate: tomorrow() })}
        title="复制到明天 Duplicate to tomorrow"
        className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
      >
        复制
      </button>
      {canDelete ? (
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (confirm("删除这个任务？此操作无法撤销。")) call("DELETE", "");
          }}
          className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
        >
          删除
        </button>
      ) : null}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
