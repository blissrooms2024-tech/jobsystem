"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreVertical, Eye, Pencil, Check, Ban, RotateCcw, Copy, Trash2 } from "lucide-react";
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
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    function onScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  const call = (method: "POST" | "DELETE", path: string, body?: unknown, onSuccess?: () => void) => {
    setError(null);
    setOpen(false);
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

  const toggleMenu = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: Math.max(8, r.right - 176) });
    }
    setOpen((o) => !o);
  };

  const itemClass = "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-50";

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        title={t("操作", "Actions")}
        aria-label={t("操作", "Actions")}
        onClick={toggleMenu}
        className="rounded-md border border-neutral-200 p-1 hover:bg-neutral-50"
      >
        <MoreVertical size={16} />
      </button>
      {open && pos
        ? createPortal(
            <div
              ref={menuRef}
              style={{ position: "fixed", top: pos.top, left: pos.left }}
              className="z-50 w-44 overflow-hidden rounded-md border border-neutral-200 bg-white shadow-lg"
            >
              <Link href={`/jobs/${jobId}`} onClick={() => setOpen(false)} className={itemClass}>
                <Eye size={14} /> {t("查看", "View")}
              </Link>
              <Link href={`/jobs/${jobId}/edit`} onClick={() => setOpen(false)} className={itemClass}>
                <Pencil size={14} /> {t("编辑", "Edit")}
              </Link>
              {status === "assigned" || status === "in_progress" || status === "missed" ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (confirm(t("标记这个任务为已完成？不需要照片。", "Mark this job completed? No photos needed."))) {
                      call("POST", "/complete");
                    }
                  }}
                  className={itemClass}
                >
                  <Check size={14} /> {t("标记完成", "Mark completed")}
                </button>
              ) : null}
              {status !== "completed" && status !== "cancelled" ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (confirm("取消这个任务？")) call("POST", "/cancel");
                  }}
                  className={itemClass}
                >
                  <Ban size={14} /> {t("取消", "Cancel")}
                </button>
              ) : null}
              {status === "missed" || status === "cancelled" ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (confirm("重开这个任务？")) call("POST", "/reopen");
                  }}
                  className={itemClass}
                >
                  <RotateCcw size={14} /> {t("重开", "Reopen")}
                </button>
              ) : null}
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  const target = tomorrow();
                  call("POST", "/duplicate", { schedDate: target }, () => router.push(`/jobs?date=${target}`));
                }}
                className={itemClass}
              >
                <Copy size={14} /> {t("复制到明天", "Duplicate to tomorrow")}
              </button>
              {canDelete ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (confirm("删除这个任务？此操作无法撤销。")) call("DELETE", "");
                  }}
                  className={`${itemClass} text-red-700 hover:bg-red-50`}
                >
                  <Trash2 size={14} /> {t("删除", "Delete")}
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
      {error ? <div className="mt-1 text-xs text-red-600">{error}</div> : null}
    </div>
  );
}
