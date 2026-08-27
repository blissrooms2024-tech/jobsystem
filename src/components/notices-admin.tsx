"use client";

import { useEffect, useState, useTransition } from "react";
import { Bi } from "@/components/bi";
import { useLang } from "@/lib/use-lang";

type Notice = {
  id: string;
  title: string;
  content: string | null;
  active: boolean;
  startDate: string | null;
  endDate: string | null;
};

export function NoticesAdmin() {
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [notices, setNotices] = useState<Notice[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetch("/api/notices")
      .then((res) => (res.ok ? res.json() : { notices: [] }))
      .then((data) => setNotices(data.notices ?? []));
  };

  useEffect(() => {
    load();
  }, []);

  const create = () => {
    if (!title.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      });
      if (!res.ok) {
        setError(t("保存失败", "Failed to save"));
        return;
      }
      setTitle("");
      setContent("");
      setStartDate("");
      setEndDate("");
      setShowAdd(false);
      load();
    });
  };

  const toggleActive = (n: Notice) => {
    startTransition(async () => {
      await fetch(`/api/notices/${n.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !n.active }),
      });
      load();
    });
  };

  const remove = (n: Notice) => {
    if (!confirm(t(`删除公告"${n.title}"？`, `Delete notice "${n.title}"?`))) return;
    startTransition(async () => {
      await fetch(`/api/notices/${n.id}`, { method: "DELETE" });
      load();
    });
  };

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-700">
          <Bi zh="公告" en="Notices" />
        </h2>
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
        >
          {showAdd ? <Bi zh="取消" en="Cancel" /> : <>+ <Bi zh="添加公告" en="Add notice" /></>}
        </button>
      </div>

      {showAdd ? (
        <div className="space-y-2 rounded-md bg-neutral-50 p-3 text-sm">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("标题", "Title")}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("内容（可选）", "Content (optional)")}
            rows={2}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1">
              <span className="text-xs text-neutral-500"><Bi zh="开始" en="Start" /></span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-md border border-neutral-300 px-2 py-1"
              />
            </label>
            <label className="flex items-center gap-1">
              <span className="text-xs text-neutral-500"><Bi zh="结束" en="End" /></span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-md border border-neutral-300 px-2 py-1"
              />
            </label>
            <span className="text-xs text-neutral-400">
              <Bi zh="不填日期 = 一直显示直到手动关闭" en="Leave blank = shown until manually turned off" />
            </span>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            disabled={isPending || !title.trim()}
            onClick={create}
            className="rounded-md bg-purple-700 hover:bg-purple-800 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            <Bi zh="保存" en="Save" />
          </button>
        </div>
      ) : null}

      {notices === null ? (
        <p className="text-sm text-neutral-400">
          <Bi zh="加载中..." en="Loading..." />
        </p>
      ) : notices.length === 0 ? (
        <p className="text-sm text-neutral-400">
          <Bi zh="暂无公告" en="No notices yet" />
        </p>
      ) : (
        <div className="space-y-2">
          {notices.map((n) => (
            <div key={n.id} className="flex items-start justify-between gap-3 rounded-md border border-neutral-200 p-2 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{n.title}</p>
                {n.content ? <p className="text-neutral-600">{n.content}</p> : null}
                {n.startDate || n.endDate ? (
                  <p className="text-xs text-neutral-400">
                    {n.startDate ?? "—"} ~ {n.endDate ?? "—"}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => toggleActive(n)}
                  className={
                    n.active
                      ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                      : "rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600"
                  }
                >
                  <Bi zh={n.active ? "显示中" : "已关闭"} en={n.active ? "Active" : "Off"} />
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => remove(n)}
                  className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                >
                  <Bi zh="删除" en="Delete" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
