"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ExternalLink, CheckCircle2 } from "lucide-react";
import { Bi } from "@/components/bi";
import { useLang } from "@/lib/use-lang";

export type JobTypeOption = { id: string; typeName: string };

export type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  jobTypeId: string | null;
};

export function CoursesPageClient({
  rows,
  jobTypes,
  completedIds,
  isAdmin,
}: {
  rows: CourseRow[];
  jobTypes: JobTypeOption[];
  completedIds: string[];
  isAdmin: boolean;
}) {
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [showAdd, setShowAdd] = useState(false);
  const [completed, setCompleted] = useState(new Set(completedIds));

  const jobTypeName = (id: string | null) => jobTypes.find((jt) => jt.id === id)?.typeName ?? null;

  const markComplete = (id: string) => {
    setCompleted((prev) => new Set(prev).add(id));
    fetch(`/api/courses/${id}/complete`, { method: "POST" }).catch(() => {
      setCompleted((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    });
  };

  const doneCount = rows.filter((r) => completed.has(r.id)).length;

  return (
    <div className="space-y-6">
      {rows.length > 0 ? (
        <div className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
          <p className="text-2xl font-semibold">
            {doneCount}/{rows.length}
          </p>
          <p className="text-sm text-neutral-500">
            <Bi zh="已完成课程" en="Courses completed" />
          </p>
        </div>
      ) : null}

      {isAdmin ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-md bg-purple-700 hover:bg-purple-800 px-3 py-1.5 text-sm font-medium text-white"
          >
            {showAdd ? <Bi zh="取消" en="Cancel" /> : <>+ <Bi zh="添加课程" en="Add course" /></>}
          </button>
        </div>
      ) : null}

      {showAdd ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <CourseForm jobTypes={jobTypes} onDone={() => setShowAdd(false)} />
        </div>
      ) : null}

      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-neutral-400">
            <Bi zh="暂无课程" en="No courses yet" />
          </p>
        ) : (
          rows.map((r) => (
            <CourseItem
              key={r.id}
              row={r}
              jobTypeName={jobTypeName(r.jobTypeId)}
              jobTypes={jobTypes}
              isAdmin={isAdmin}
              isComplete={completed.has(r.id)}
              onMarkComplete={() => markComplete(r.id)}
              t={t}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CourseItem({
  row,
  jobTypeName,
  jobTypes,
  isAdmin,
  isComplete,
  onMarkComplete,
  t,
}: {
  row: CourseRow;
  jobTypeName: string | null;
  jobTypes: JobTypeOption[];
  isAdmin: boolean;
  isComplete: boolean;
  onMarkComplete: () => void;
  t: (zh: string, en: string) => string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const del = () => {
    if (!confirm(t(`删除"${row.title}"？`, `Delete "${row.title}"?`))) return;
    startTransition(async () => {
      await fetch(`/api/courses/${row.id}`, { method: "DELETE" });
      router.refresh();
    });
  };

  if (editing) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <CourseForm jobTypes={jobTypes} initial={row} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 p-3">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-medium">{row.title}</p>
        {row.description ? <p className="text-sm text-neutral-600">{row.description}</p> : null}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {jobTypeName ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
              <Bi zh={`需完成才能接：${jobTypeName}`} en={`Required for: ${jobTypeName}`} />
            </span>
          ) : null}
          <a
            href={row.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-purple-700 hover:underline"
          >
            <ExternalLink size={13} /> <Bi zh="观看视频" en="Watch video" />
          </a>
        </div>
        <div className="pt-1">
          {isComplete ? (
            <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
              <CheckCircle2 size={15} /> <Bi zh="已完成" en="Completed" />
            </span>
          ) : (
            <button
              type="button"
              onClick={onMarkComplete}
              className="rounded-md bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-700"
            >
              <Bi zh="我已看完" en="I've watched this" />
            </button>
          )}
        </div>
      </div>
      {isAdmin ? (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            title={t("编辑", "Edit")}
            onClick={() => setEditing(true)}
            className="rounded-md border border-neutral-200 p-1.5 hover:bg-neutral-50"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            disabled={isPending}
            title={t("删除", "Delete")}
            onClick={del}
            className="rounded-md border border-red-200 p-1.5 text-red-700 hover:bg-red-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CourseForm({
  jobTypes,
  initial,
  onDone,
}: {
  jobTypes: JobTypeOption[];
  initial?: CourseRow;
  onDone: () => void;
}) {
  const router = useRouter();
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl ?? "");
  const [jobTypeId, setJobTypeId] = useState(initial?.jobTypeId ?? "");

  const save = () => {
    if (!title.trim() || !videoUrl.trim()) return;
    setError(null);
    startTransition(async () => {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        videoUrl: videoUrl.trim(),
        jobTypeId: jobTypeId || null,
      };
      const res = await fetch(initial ? `/api/courses/${initial.id}` : "/api/courses", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : t("保存失败", "Failed to save"));
        return;
      }
      onDone();
      router.refresh();
    });
  };

  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <label className="col-span-2 space-y-1 sm:col-span-1">
        <span className="font-medium"><Bi zh="标题" en="Title" /> *</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("例如：Mudah.com 注册教学", "e.g. Mudah.com Registration Tutorial")}
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
        />
      </label>
      <label className="col-span-2 space-y-1 sm:col-span-1">
        <span className="font-medium"><Bi zh="所需 Job 类型（可选）" en="Required for job type (optional)" /></span>
        <select
          value={jobTypeId}
          onChange={(e) => setJobTypeId(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
        >
          <option value="">{t("不限制（一般课程）", "None (general course)")}</option>
          {jobTypes.map((jt) => (
            <option key={jt.id} value={jt.id}>
              {jt.typeName}
            </option>
          ))}
        </select>
      </label>
      <label className="col-span-2 space-y-1">
        <span className="font-medium"><Bi zh="说明" en="Description" /></span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
        />
      </label>
      <label className="col-span-2 space-y-1">
        <span className="font-medium"><Bi zh="视频链接（YouTube / Google Drive）" en="Video link (YouTube / Google Drive)" /> *</span>
        <input
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
        />
      </label>

      {error ? <p className="col-span-2 text-red-600">{error}</p> : null}

      <div className="col-span-2 flex items-center gap-2">
        <button
          type="button"
          disabled={isPending || !title.trim() || !videoUrl.trim()}
          onClick={save}
          className="rounded-md bg-purple-700 hover:bg-purple-800 px-3 py-1.5 font-medium text-white disabled:opacity-50"
        >
          <Bi zh="保存" en="Save" />
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md border border-neutral-200 px-3 py-1.5 hover:bg-neutral-50"
        >
          <Bi zh="取消" en="Cancel" />
        </button>
      </div>
    </div>
  );
}
