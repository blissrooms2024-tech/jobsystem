"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Bi } from "@/components/bi";
import { useLang } from "@/lib/use-lang";

// Lets admin view/add/correct the post link at any time, regardless of the
// job's status — the employee's own submit flow (JobCheckinActions) also
// writes this field, but only while the job is still open; admin needs a
// way to see and fix it afterwards too.
export function JobPostLinkField({
  jobId,
  initialValue,
}: {
  jobId: string;
  initialValue: string | null;
}) {
  const router = useRouter();
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [value, setValue] = useState(initialValue ?? "");
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postLink: value.trim() || null }),
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
      <div className="col-span-2 flex items-center gap-2">
        {value ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 break-all text-purple-700 hover:underline"
          >
            <ExternalLink size={13} /> {value}
          </a>
        ) : (
          <span className="text-neutral-400">
            <Bi zh="尚未填写" en="Not yet submitted" />
          </span>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md border border-neutral-200 px-2 py-0.5 text-xs hover:bg-neutral-50"
        >
          <Bi zh={value ? "编辑" : "填写"} en={value ? "Edit" : "Add"} />
        </button>
      </div>
    );
  }

  return (
    <div className="col-span-2 flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="https://..."
        className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm"
      />
      <button
        type="button"
        disabled={isPending}
        onClick={save}
        className="rounded-md bg-purple-700 hover:bg-purple-800 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
      >
        <Bi zh="保存" en="Save" />
      </button>
      <button
        type="button"
        onClick={() => {
          setValue(initialValue ?? "");
          setEditing(false);
          setError(null);
        }}
        className="rounded-md border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-50"
      >
        <Bi zh="取消" en="Cancel" />
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
