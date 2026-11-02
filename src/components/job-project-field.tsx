"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bi } from "@/components/bi";
import { useLang } from "@/lib/use-lang";

// Inline editor so the posting agent (or admin) can set/change the job's
// project straight from the job page — projects change often, so agents
// fill it in themselves instead of waiting for admin.
export function JobProjectField({
  jobId,
  initialValue,
  suggestions,
}: {
  jobId: string;
  initialValue: string | null;
  suggestions: string[];
}) {
  const router = useRouter();
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [value, setValue] = useState(initialValue ?? "");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project: value.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === "string" ? data.error : t("保存失败", "Failed to save"));
        return;
      }
      setEditing(false);
      router.refresh();
    });
  };

  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {initialValue ? (
          <span className="font-medium">{initialValue}</span>
        ) : (
          <span className="text-neutral-400">
            <Bi zh="尚未填写" en="Not set" />
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            setValue(initialValue ?? "");
            setEditing(true);
          }}
          className="rounded-md border border-neutral-200 px-2 py-0.5 text-xs hover:bg-neutral-50"
        >
          <Bi zh={initialValue ? "更改" : "填写"} en={initialValue ? "Change" : "Set"} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          list={`project-suggestions-${jobId}`}
          placeholder={t("选择或输入项目", "Pick or type a project")}
          className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm"
        />
        <datalist id={`project-suggestions-${jobId}`}>
          {suggestions.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
        <button
          type="button"
          disabled={isPending}
          onClick={save}
          className="rounded-md bg-purple-700 px-3 py-1 text-xs font-medium text-white hover:bg-purple-800 disabled:opacity-50"
        >
          <Bi zh="保存" en="Save" />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-md border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-50"
        >
          <Bi zh="取消" en="Cancel" />
        </button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
