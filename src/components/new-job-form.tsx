"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; label: string };

export function NewJobForm({
  units,
  jobTypes,
  employees,
  minDate,
  maxDate,
}: {
  units: Option[];
  jobTypes: (Option & { pay: string })[];
  employees: Option[];
  minDate: string;
  maxDate: string;
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
            description: String(formData.get("description") || "") || undefined,
            unitId: String(formData.get("unitId") || "") || undefined,
            assignedTo: String(formData.get("assignedTo") || ""),
            schedDate: String(formData.get("schedDate") || ""),
            repeatUntil: String(formData.get("repeatUntil") || "") || undefined,
            startTime: String(formData.get("startTime") || "") || undefined,
            endTime: String(formData.get("endTime") || "") || undefined,
            jobTypeId: String(formData.get("jobTypeId") || "") || undefined,
            notes: String(formData.get("notes") || "") || undefined,
          };
          const res = await fetch("/api/jobs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setError(typeof data.error === "string" ? data.error : "创建失败 Failed to create job");
            return;
          }
          if (data.count > 1) {
            router.push("/jobs");
          } else {
            router.push(`/jobs/${data.job.id}`);
          }
        });
      }}
    >
      <Field label="标题 Title">
        <input name="title" required className="input" />
      </Field>
      <Field label="说明 Description">
        <textarea name="description" className="input" rows={3} />
      </Field>
      <Field label="工种 Job type">
        <select name="jobTypeId" className="input">
          <option value="">-- 选择 select --</option>
          {jobTypes.map((jt) => (
            <option key={jt.id} value={jt.id}>
              {jt.label} (RM {jt.pay})
            </option>
          ))}
        </select>
      </Field>
      <Field label="单位 Unit">
        <select name="unitId" className="input">
          <option value="">-- 选择 select --</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="负责人 Assign to">
        <select name="assignedTo" required className="input">
          <option value="">-- 选择 select --</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="日期 Date">
          <input type="date" name="schedDate" required min={minDate} max={maxDate} className="input" />
        </Field>
        <Field label="重复直到（可选）Repeat until (optional)">
          <input type="date" name="repeatUntil" min={minDate} max={maxDate} className="input" />
        </Field>
      </div>
      <p className="-mt-2 text-xs text-neutral-500">
        填了&ldquo;重复直到&rdquo;，就会从上面的日期开始，每天都建一份一样的任务，直到这个日期为止（同一个人、同一个单位）。
        <br />
        Fill in &quot;Repeat until&quot; to create the same job every day from the start date through that date (same
        assignee, same unit).
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="开始时间 Start">
          <input type="time" name="startTime" className="input" />
        </Field>
        <Field label="结束时间 End">
          <input type="time" name="endTime" className="input" />
        </Field>
      </div>
      <Field label="备注 Notes">
        <textarea name="notes" className="input" rows={2} />
      </Field>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-purple-700 hover:bg-purple-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "创建中... Creating..." : "创建任务 Create job"}
      </button>

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
