"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2, Copy, ExternalLink } from "lucide-react";
import { Bi } from "@/components/bi";
import { useLang } from "@/lib/use-lang";
import {
  ResourceForm,
  linkHref,
  TYPE_LABEL,
  type Row,
  type UnitOption,
  type EmployeeOption,
} from "@/components/resources-page-client";

export function ResourceDetailClient({
  row,
  units,
  employees,
  isAdmin,
}: {
  row: Row;
  units: UnitOption[];
  employees: EmployeeOption[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const backHref = row.type === "contact" ? "/contacts" : "/resources";

  const del = () => {
    if (!confirm(t(`删除"${row.title}"？`, `Delete "${row.title}"?`))) return;
    startTransition(async () => {
      await fetch(`/api/resources/${row.id}`, { method: "DELETE" });
      router.push(backHref);
    });
  };

  const duplicate = () => {
    startTransition(async () => {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: row.type,
          title: `${row.title} (${t("副本", "copy")})`,
          content: row.content ?? "",
          url: row.url ?? "",
          unitIds: row.unitIds,
          staffType: row.staffType,
          userId: row.userId,
        }),
      });
      if (!res.ok) {
        alert(t("复制失败", "Copy failed"));
        return;
      }
      const data = await res.json();
      router.push(`/resources/${data.resource.id}`);
    });
  };

  const unitNames = row.unitIds?.length
    ? units.filter((u) => row.unitIds!.includes(u.id)).map((u) => u.unitName)
    : [];
  const badges = unitNames.length > 0 || row.staffType || row.assigneeName;

  return (
    <div className="max-w-2xl space-y-4">
      <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:underline">
        <ArrowLeft size={14} /> <Bi zh="返回" en="Back" />
      </Link>

      {editing ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <ResourceForm
            units={units}
            employees={employees}
            types={[row.type]}
            initial={row}
            onDone={() => setEditing(false)}
          />
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-neutral-200 p-5">
          <p className="text-xs text-neutral-400">{t(TYPE_LABEL[row.type].zh, TYPE_LABEL[row.type].en)}</p>
          <h1 className="text-xl font-semibold">{row.title}</h1>
          {row.content ? <p className="whitespace-pre-wrap text-sm text-neutral-700">{row.content}</p> : null}
          {row.url ? (
            <a
              href={linkHref(row.url)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-purple-700 hover:underline"
            >
              <ExternalLink size={14} /> {row.url}
            </a>
          ) : null}
          {badges ? (
            <p className="flex flex-wrap gap-1 pt-1">
              {unitNames.map((name) => (
                <span key={name} className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">{name}</span>
              ))}
              {row.staffType ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{row.staffType}</span>
              ) : null}
              {row.assigneeName ? (
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800">
                  {row.assigneeStaffId ?? row.assigneeUserCode} · {row.assigneeName}
                </span>
              ) : null}
            </p>
          ) : null}

          {isAdmin ? (
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex items-center gap-1 rounded-md border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50"
              >
                <Pencil size={14} /> <Bi zh="编辑" en="Edit" />
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={duplicate}
                className="flex items-center gap-1 rounded-md border border-neutral-200 px-3 py-1.5 text-sm hover:bg-neutral-50"
              >
                <Copy size={14} /> <Bi zh="复制" en="Copy" />
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={del}
                className="flex items-center gap-1 rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
              >
                <Trash2 size={14} /> <Bi zh="删除" en="Delete" />
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
