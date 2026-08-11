"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Option = { id: string; label: string };

export function GeneratePayrollForm({ employees }: { employees: Option[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="max-w-md space-y-4"
      action={(formData: FormData) => {
        setError(null);
        startTransition(async () => {
          const payload = {
            userId: String(formData.get("userId") || ""),
            periodStart: String(formData.get("periodStart") || ""),
            periodEnd: String(formData.get("periodEnd") || ""),
            periodType: "custom" as const,
          };
          const res = await fetch("/api/payroll/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            setError("生成失败 Failed to generate");
            return;
          }
          const { payroll } = await res.json();
          router.push(`/payroll/${payroll.id}`);
        });
      }}
    >
      <div className="space-y-1">
        <label className="text-sm font-medium">员工 Employee</label>
        <select name="userId" required className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          <option value="">-- 选择 select --</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">开始 Period start</label>
          <input
            type="date"
            name="periodStart"
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">结束 Period end</label>
          <input
            type="date"
            name="periodEnd"
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <p className="text-xs text-neutral-500">
        系统会自动汇总该员工在此周期内所有已完成且尚未计入工资单的任务金额。
        <br />
        This will sum all completed jobs in this period not yet attached to a payslip.
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "生成中... Generating..." : "生成草稿 Generate draft"}
      </button>
    </form>
  );
}
