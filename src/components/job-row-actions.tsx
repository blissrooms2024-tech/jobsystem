"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { useLang } from "@/lib/use-lang";

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
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const call = (method: "POST" | "DELETE", path: string, body?: unknown, onSuccess?: () => void) => {
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
      if (onSuccess) onSuccess();
      else router.refresh();
    });
  };

  const tomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  return (
    <div className="flex flex-nowrap items-center gap-0.5">
      <Link
        href={`/jobs/${jobId}/edit`}
        title={t("编辑", "Edit")}
        aria-label={t("编辑", "Edit")}
        className="rounded-md border border-neutral-200 px-1 py-0.5 text-xs hover:bg-neutral-50"
      >
        <Pencil size={12} />
      </Link>
      {status !== "completed" && status !== "cancelled" ? (
        <button
          type="button"
          disabled={isPending}
          title={t("取消", "Cancel")}
          aria-label={t("取消", "Cancel")}
          onClick={() => {
            if (confirm("取消这个任务？")) call("POST", "/cancel");
          }}
          className="rounded-md border border-neutral-200 px-1 py-0.5 text-xs hover:bg-neutral-50"
        >
          🚫
        </button>
      ) : null}
      {status === "missed" || status === "cancelled" ? (
        <button
          type="button"
          disabled={isPending}
          title={t("重开", "Reopen")}
          aria-label={t("重开", "Reopen")}
          onClick={() => {
            if (confirm("重开这个任务？")) call("POST", "/reopen");
          }}
          className="rounded-md border border-neutral-200 px-1 py-0.5 text-xs hover:bg-neutral-50"
        >
          ↩️
        </button>
      ) : null}
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          const target = tomorrow();
          call("POST", "/duplicate", { schedDate: target }, () => router.push(`/jobs?date=${target}`));
        }}
        title={t("复制到明天", "Duplicate to tomorrow")}
        aria-label={t("复制到明天", "Duplicate to tomorrow")}
        className="rounded-md border border-neutral-200 px-1 py-0.5 text-xs hover:bg-neutral-50"
      >
        📋
      </button>
      {canDelete ? (
        <button
          type="button"
          disabled={isPending}
          title={t("删除", "Delete")}
          aria-label={t("删除", "Delete")}
          onClick={() => {
            if (confirm("删除这个任务？此操作无法撤销。")) call("DELETE", "");
          }}
          className="rounded-md border border-red-200 px-1 py-0.5 text-xs text-red-700 hover:bg-red-50"
        >
          🗑️
        </button>
      ) : null}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
