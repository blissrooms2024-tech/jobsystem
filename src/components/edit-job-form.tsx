"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bi } from "@/components/bi";

type Option = { id: string; label: string };

export function EditJobForm({
  jobId,
  units,
  jobTypes,
  employees,
  minDate,
  maxDate,
  initial,
}: {
  jobId: string;
  units: Option[];
  jobTypes: (Option & { pay: string })[];
  employees: Option[];
  minDate: string;
  maxDate: string;
  initial: {
    title: string;
    description: string | null;
    unitId: string | null;
    assignedTo: string | null;
    schedDate: string;
    startTime: string | null;
    endTime: string | null;
    jobTypeId: string | null;
    notes: string | null;
    pay: string;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="max-w-lg space-y-4"
      action={(formData: FormData) => {
        setError(null);
        startTransition(async () => {
          const payload = {
            title: String(formData.get("title") || ""),
            description: String(formData.get("description") || ""),
            unitId: String(formData.get("unitId") || "") || null,
            assignedTo: String(formData.get("assignedTo") || ""),
            schedDate: String(formData.get("schedDate") || ""),
            startTime: String(formData.get("startTime") || "") || null,
            endTime: String(formData.get("endTime") || "") || null,
            jobTypeId: String(formData.get("jobTypeId") || "") || null,
            notes: String(formData.get("notes") || ""),
            pay: String(formData.get("pay") || ""),
          };
          const res = await fetch(`/api/jobs/${jobId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setError(typeof data.error === "string" ? data.error : "保存失败 Failed to save");
            return;
          }
          router.push(`/jobs/${jobId}`);
          router.refresh();
        });
      }}
    >
      <Field labelZh="标题" labelEn="Title">
        <input name="title" defaultValue={initial.title} required className="input" />
      </Field>
      <Field labelZh="说明" labelEn="Description">
        <textarea name="description" defaultValue={initial.description ?? ""} className="input" rows={3} />
      </Field>
      <Field labelZh="工种" labelEn="Job type">
        <select name="jobTypeId" defaultValue={initial.jobTypeId ?? ""} className="input">
          <option value="">-- 选择 select --</option>
          {jobTypes.map((jt) => (
            <option key={jt.id} value={jt.id}>
              {jt.label} (RM {jt.pay})
            </option>
          ))}
        </select>
      </Field>
      <Field labelZh="单位" labelEn="Unit">
        <select name="unitId" defaultValue={initial.unitId ?? ""} className="input">
          <option value="">-- 选择 select --</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </select>
      </Field>
      <Field labelZh="负责人" labelEn="Assign to">
        <select name="assignedTo" defaultValue={initial.assignedTo ?? ""} required className="input">
          <option value="">-- 选择 select --</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field labelZh="日期" labelEn="Date">
          <input type="date" name="schedDate" defaultValue={initial.schedDate} required min={minDate} max={maxDate} className="input" />
        </Field>
        <Field labelZh="工资" labelEn="Pay (RM)">
          <input type="number" step="0.01" name="pay" defaultValue={initial.pay} className="input" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field labelZh="开始时间" labelEn="Start">
          <input type="time" name="startTime" defaultValue={initial.startTime ?? ""} className="input" />
        </Field>
        <Field labelZh="结束时间" labelEn="End">
          <input type="time" name="endTime" defaultValue={initial.endTime ?? ""} className="input" />
        </Field>
      </div>
      <Field labelZh="备注" labelEn="Notes">
        <textarea name="notes" defaultValue={initial.notes ?? ""} className="input" rows={2} />
      </Field>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-purple-700 hover:bg-purple-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending ? <Bi zh="保存中..." en="Saving..." /> : <Bi zh="保存" en="Save" />}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/jobs/${jobId}`)}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
        >
          <Bi zh="取消" en="Cancel" />
        </button>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid #d4d4d4;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 14px;
        }
      `}</style>
    </form>
  );
}

function Field({
  labelZh,
  labelEn,
  children,
}: {
  labelZh: string;
  labelEn: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">
        <Bi zh={labelZh} en={labelEn} />
      </label>
      {children}
    </div>
  );
}
