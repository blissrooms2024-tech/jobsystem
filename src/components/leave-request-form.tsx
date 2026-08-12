"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bi } from "@/components/bi";

export function LeaveRequestForm() {
  const router = useRouter();
  const [error, setError] = useState<React.ReactNode>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="max-w-md space-y-4"
      action={(formData: FormData) => {
        setError(null);
        startTransition(async () => {
          const payload = {
            type: String(formData.get("type") || ""),
            startDate: String(formData.get("startDate") || ""),
            endDate: String(formData.get("endDate") || ""),
            days: String(formData.get("days") || ""),
            reason: String(formData.get("reason") || "") || undefined,
          };
          const res = await fetch("/api/leaves", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            setError(<Bi zh="提交失败" en="Failed to submit" />);
            return;
          }
          router.push("/leaves");
          router.refresh();
        });
      }}
    >
      <div className="space-y-1">
        <label className="text-sm font-medium">
          <Bi zh="类型" en="Type" />
        </label>
        <select name="type" required className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
          <option value="Annual">年假 Annual</option>
          <option value="Sick">病假 Sick</option>
          <option value="Unpaid">无薪假 Unpaid</option>
          <option value="Other">其他 Other</option>
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium">
            <Bi zh="开始" en="Start" />
          </label>
          <input type="date" name="startDate" required className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">
            <Bi zh="结束" en="End" />
          </label>
          <input type="date" name="endDate" required className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">
          <Bi zh="天数" en="Days" />
        </label>
        <input type="number" name="days" step="0.5" min="0.5" required className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">
          <Bi zh="原因" en="Reason" />
        </label>
        <textarea name="reason" rows={3} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-purple-700 hover:bg-purple-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? <Bi zh="提交中..." en="Submitting..." /> : <Bi zh="提交申请" en="Submit request" />}
      </button>
    </form>
  );
}
