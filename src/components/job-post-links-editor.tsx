"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Plus, X } from "lucide-react";
import { Bi } from "@/components/bi";
import { useLang } from "@/lib/use-lang";

// Several link slots per job: Mudah and iBilik posts are approved on
// different days, so the agent adds each link as it goes live and saves
// without having to submit the whole job.
export function JobPostLinksEditor({
  jobId,
  initialLinks,
  canEdit,
}: {
  jobId: string;
  initialLinks: string[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [editing, setEditing] = useState(false);
  const [links, setLinks] = useState<string[]>(initialLinks);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const startEditing = () => {
    setLinks(initialLinks.length > 0 ? [...initialLinks, ""] : ["", ""]);
    setError(null);
    setEditing(true);
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postLinks: links }),
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
      <div className="space-y-1">
        {initialLinks.length > 0 ? (
          <ol className="space-y-1">
            {initialLinks.map((link, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-xs text-neutral-400">{i + 1}.</span>
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-start gap-1 break-all font-medium text-purple-700 hover:underline"
                >
                  <ExternalLink size={13} className="mt-0.5 shrink-0" /> {link}
                </a>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-neutral-400">
            <Bi zh="尚未填写" en="Not yet submitted" />
          </p>
        )}
        {canEdit ? (
          <button
            type="button"
            onClick={startEditing}
            className="rounded-md border border-neutral-200 px-2 py-0.5 text-xs hover:bg-neutral-50"
          >
            <Bi
              zh={initialLinks.length > 0 ? "添加 / 编辑链接" : "填写链接"}
              en={initialLinks.length > 0 ? "Add / edit links" : "Add links"}
            />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {links.map((link, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-4 text-xs text-neutral-400">{i + 1}.</span>
          <input
            type="text"
            value={link}
            onChange={(e) => setLinks((prev) => prev.map((l, j) => (j === i ? e.target.value : l)))}
            placeholder={t("粘贴 Mudah / iBilik 帖子链接", "Paste a Mudah / iBilik post link")}
            className="flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => setLinks((prev) => prev.filter((_, j) => j !== i))}
            aria-label={t("删除", "Remove")}
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setLinks((prev) => [...prev, ""])}
        className="inline-flex items-center gap-1 rounded-md border border-dashed border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
      >
        <Plus size={13} /> <Bi zh="再加一个链接" en="Add another link" />
      </button>
      <div className="flex items-center gap-2">
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
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
    </div>
  );
}
