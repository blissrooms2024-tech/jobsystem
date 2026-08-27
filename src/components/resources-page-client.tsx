"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ExternalLink, Copy } from "lucide-react";
import { STAFF_TYPE_SUGGESTIONS } from "@/lib/staff-types";
import { Bi } from "@/components/bi";
import { useLang } from "@/lib/use-lang";

type ResourceType = "guideline" | "tutorial" | "contact" | "drive_link";

type Row = {
  id: string;
  type: ResourceType;
  title: string;
  content: string | null;
  url: string | null;
  unitId: string | null;
  unitName: string | null;
  staffType: string | null;
  userId: string | null;
  assigneeName: string | null;
  assigneeStaffId: string | null;
  assigneeUserCode: string | null;
};

type UnitOption = { id: string; unitName: string };
type EmployeeOption = { id: string; name: string; staffId: string | null; userCode: string };

// Contacts are usually just a phone/WhatsApp number, not a real URL — turn
// those into a tel: link instead of trying to navigate to them as-is.
function linkHref(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  const digits = value.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : value;
}

const TYPE_LABEL: Record<ResourceType, { zh: string; en: string }> = {
  guideline: { zh: "指南 / SOP", en: "Guidelines" },
  tutorial: { zh: "教程", en: "Tutorials" },
  contact: { zh: "联系方式", en: "Contacts" },
  drive_link: { zh: "Google Drive 链接", en: "Drive Links" },
};
const ALL_TYPES: ResourceType[] = ["guideline", "tutorial", "drive_link", "contact"];

export function ResourcesPageClient({
  rows,
  units,
  employees,
  isAdmin,
  types = ALL_TYPES,
  addLabel,
}: {
  rows: Row[];
  units: UnitOption[];
  employees: EmployeeOption[];
  isAdmin: boolean;
  /** Restrict which resource types this page manages/shows — e.g. the
   * Contacts page only deals with "contact". Single-type pages skip the
   * type picker and the grouped section headers. */
  types?: ResourceType[];
  addLabel?: { zh: string; en: string };
}) {
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [showAdd, setShowAdd] = useState(false);
  const singleType = types.length === 1 ? types[0] : null;

  const grouped = useMemo(() => {
    const map = new Map<ResourceType, Row[]>();
    for (const type of types) map.set(type, []);
    for (const r of rows) if (types.includes(r.type)) map.get(r.type)?.push(r);
    return map;
  }, [rows, types]);

  return (
    <div className="space-y-6">
      {isAdmin ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-md bg-purple-700 hover:bg-purple-800 px-3 py-1.5 text-sm font-medium text-white"
          >
            {showAdd ? (
              <Bi zh="取消" en="Cancel" />
            ) : (
              <>+ <Bi zh={addLabel?.zh ?? "添加资源"} en={addLabel?.en ?? "Add resource"} /></>
            )}
          </button>
        </div>
      ) : null}

      {showAdd ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <ResourceForm units={units} employees={employees} types={types} onDone={() => setShowAdd(false)} />
        </div>
      ) : null}

      {singleType ? (
        <div className="space-y-2">
          {(grouped.get(singleType) ?? []).length === 0 ? (
            <p className="text-sm text-neutral-400">
              <Bi zh="暂无内容" en="Nothing here yet" />
            </p>
          ) : (
            (grouped.get(singleType) ?? []).map((r) => (
              <ResourceItem key={r.id} row={r} units={units} employees={employees} types={types} isAdmin={isAdmin} t={t} />
            ))
          )}
        </div>
      ) : (
        types.map((type) => {
          const items = grouped.get(type) ?? [];
          if (items.length === 0 && !isAdmin) return null;
          return (
            <div key={type} className="space-y-2">
              <h2 className="text-sm font-semibold text-neutral-700">
                <Bi zh={TYPE_LABEL[type].zh} en={TYPE_LABEL[type].en} />
              </h2>
              {items.length === 0 ? (
                <p className="text-sm text-neutral-400">
                  <Bi zh="暂无内容" en="Nothing here yet" />
                </p>
              ) : (
                <div className="space-y-2">
                  {items.map((r) => (
                    <ResourceItem key={r.id} row={r} units={units} employees={employees} types={types} isAdmin={isAdmin} t={t} />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function ResourceItem({
  row,
  units,
  employees,
  types,
  isAdmin,
  t,
}: {
  row: Row;
  units: UnitOption[];
  employees: EmployeeOption[];
  types: ResourceType[];
  isAdmin: boolean;
  t: (zh: string, en: string) => string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [isPending, startTransition] = useTransition();

  const del = () => {
    if (!confirm(t(`删除"${row.title}"？`, `Delete "${row.title}"?`))) return;
    startTransition(async () => {
      await fetch(`/api/resources/${row.id}`, { method: "DELETE" });
      router.refresh();
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
          unitId: row.unitId,
          staffType: row.staffType,
          userId: row.userId,
        }),
      });
      if (!res.ok) {
        alert(t("复制失败", "Copy failed"));
        return;
      }
      router.refresh();
    });
  };

  if (editing) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <ResourceForm units={units} employees={employees} types={types} initial={row} onDone={() => setEditing(false)} />
      </div>
    );
  }

  const badges = row.unitName || row.staffType || row.assigneeName;

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 p-3">
      <button
        type="button"
        onClick={() => setShowDetail(true)}
        className="min-w-0 flex-1 space-y-1 text-left"
      >
        <p className="font-medium">{row.title}</p>
        {row.content ? <p className="line-clamp-2 text-sm text-neutral-600">{row.content}</p> : null}
        {row.url ? (
          <span className="inline-flex items-center gap-1 text-sm text-purple-700">
            <ExternalLink size={13} /> {row.url}
          </span>
        ) : null}
        {badges ? (
          <p className="flex flex-wrap gap-1 pt-1">
            {row.unitName ? (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">{row.unitName}</span>
            ) : null}
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
      </button>
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
            title={t("复制", "Copy")}
            onClick={duplicate}
            className="rounded-md border border-neutral-200 p-1.5 hover:bg-neutral-50"
          >
            <Copy size={14} />
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
      {showDetail ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowDetail(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-lg font-semibold">{row.title}</p>
            {row.content ? (
              <p className="mt-2 text-sm whitespace-pre-wrap text-neutral-600">{row.content}</p>
            ) : null}
            {row.url ? (
              <a
                href={linkHref(row.url)}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm text-purple-700 hover:underline"
              >
                <ExternalLink size={13} /> {row.url}
              </a>
            ) : null}
            {badges ? (
              <p className="mt-2 flex flex-wrap gap-1">
                {row.unitName ? (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800">{row.unitName}</span>
                ) : null}
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
            <button
              type="button"
              onClick={() => setShowDetail(false)}
              className="mt-4 w-full rounded-md bg-purple-700 hover:bg-purple-800 px-4 py-2 text-sm font-medium text-white"
            >
              <Bi zh="关闭" en="Close" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ResourceForm({
  units,
  employees,
  types,
  initial,
  onDone,
}: {
  units: UnitOption[];
  employees: EmployeeOption[];
  types: ResourceType[];
  initial?: Row;
  onDone: () => void;
}) {
  const router = useRouter();
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<ResourceType>(initial?.type ?? types[0]);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [unitId, setUnitId] = useState(initial?.unitId ?? "");
  const [staffType, setStaffType] = useState(initial?.staffType ?? "");
  const [userId, setUserId] = useState(initial?.userId ?? "");

  const save = () => {
    if (!title.trim()) return;
    setError(null);
    startTransition(async () => {
      const payload = {
        type,
        title: title.trim(),
        content: content.trim(),
        url: url.trim(),
        unitId: unitId || null,
        staffType: staffType.trim() || null,
        userId: userId || null,
      };
      const res = await fetch(initial ? `/api/resources/${initial.id}` : "/api/resources", {
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
      {types.length > 1 ? (
        <label className="col-span-2 space-y-1 sm:col-span-1">
          <span className="font-medium"><Bi zh="类型" en="Type" /></span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ResourceType)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
          >
            {types.map((ty) => (
              <option key={ty} value={ty}>
                {t(TYPE_LABEL[ty].zh, TYPE_LABEL[ty].en)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label className="col-span-2 space-y-1 sm:col-span-1">
        <span className="font-medium"><Bi zh="标题" en="Title" /> *</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
        />
      </label>
      <label className="col-span-2 space-y-1">
        <span className="font-medium"><Bi zh="内容" en="Content" /></span>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
        />
      </label>
      <label className="col-span-2 space-y-1">
        <span className="font-medium"><Bi zh="链接 / 电话 / WhatsApp" en="Link / Phone / WhatsApp" /></span>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t("https://... 或电话号码", "https://... or a phone number")}
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
        />
      </label>
      <label className="col-span-2 space-y-1 sm:col-span-1">
        <span className="font-medium"><Bi zh="单位（可选）" en="Unit (optional)" /></span>
        <select
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
        >
          <option value="">{t("全部单位", "All units")}</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.unitName}
            </option>
          ))}
        </select>
      </label>
      <label className="col-span-2 space-y-1 sm:col-span-1">
        <span className="font-medium"><Bi zh="工种（可选）" en="Staff type (optional)" /></span>
        <input
          list="resource-staff-type-suggestions"
          value={staffType}
          onChange={(e) => setStaffType(e.target.value)}
          placeholder={t("全部工种", "All staff types")}
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
        />
        <datalist id="resource-staff-type-suggestions">
          {STAFF_TYPE_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>
      <label className="col-span-2 space-y-1">
        <span className="font-medium"><Bi zh="指定员工（可选，例如各自的 Drive 链接）" en="Specific employee (optional, e.g. each person's own Drive link)" /></span>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
        >
          <option value="">{t("不指定（大家都能看到）", "Not employee-specific")}</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {(e.staffId ?? e.userCode) + " · " + e.name}
            </option>
          ))}
        </select>
      </label>

      {error ? <p className="col-span-2 text-red-600">{error}</p> : null}

      <div className="col-span-2 flex items-center gap-2">
        <button
          type="button"
          disabled={isPending || !title.trim()}
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
