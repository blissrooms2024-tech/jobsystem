"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { Bi } from "@/components/bi";
import { useLang } from "@/lib/use-lang";

export function JobTypeRow({
  id,
  typeName,
  pay,
  active,
}: {
  id: string;
  typeName: string;
  pay: string;
  active: boolean;
}) {
  const router = useRouter();
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(typeName);
  const [payInput, setPayInput] = useState(pay);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/job-types/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ typeName: nameInput.trim(), pay: payInput }),
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

  if (editing) {
    return (
      <tr className="border-t border-neutral-100">
        <td className="px-3 py-2">
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
          />
        </td>
        <td className="px-3 py-2">
          <input
            type="number"
            step="0.01"
            min="0"
            value={payInput}
            onChange={(e) => setPayInput(e.target.value)}
            className="w-24 rounded-md border border-neutral-300 px-2 py-1 text-sm"
          />
        </td>
        <td className="px-3 py-2">
          <span
            className={
              active
                ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                : "rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600"
            }
          >
            <Bi zh={active ? "启用中" : "已停用"} en={active ? "Active" : "Inactive"} />
          </span>
        </td>
        <td className="px-3 py-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={isPending || !nameInput.trim()}
              onClick={save}
              className="rounded-md bg-purple-700 hover:bg-purple-800 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              <Bi zh="保存" en="Save" />
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setNameInput(typeName);
                setPayInput(pay);
                setError(null);
                setEditing(false);
              }}
              className="rounded-md border border-neutral-200 px-2 py-1 text-xs hover:bg-neutral-50"
            >
              <Bi zh="取消" en="Cancel" />
            </button>
          </div>
          {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-neutral-100">
      <td className="px-3 py-2">{typeName}</td>
      <td className="px-3 py-2">{formatMoney(pay)}</td>
      <td className="px-3 py-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await fetch(`/api/job-types/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ active: !active }),
              });
              router.refresh();
            });
          }}
          className={
            active
              ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
              : "rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600"
          }
        >
          <Bi zh={active ? "启用中" : "已停用"} en={active ? "Active" : "Inactive"} />
        </button>
      </td>
      <td className="px-3 py-2">
        <button
          type="button"
          title={t("编辑", "Edit")}
          aria-label={t("编辑", "Edit")}
          onClick={() => setEditing(true)}
          className="rounded-md border border-neutral-200 px-1.5 py-1 text-sm hover:bg-neutral-50"
        >
          <Pencil size={14} />
        </button>
      </td>
    </tr>
  );
}
