"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { biText } from "@/lib/lang";
import { useLang } from "@/lib/use-lang";

export function DeletePayrollButton({
  payrollId,
  redirectTo,
}: {
  payrollId: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const deleteLabel = t("删除", "Delete");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        title={deleteLabel}
        aria-label={deleteLabel}
        onClick={() => {
          if (
            !confirm(
              biText("删除这张草稿工资单？此操作无法撤销。", "Delete this draft payslip? This cannot be undone."),
            )
          )
            return;
          setError(null);
          startTransition(async () => {
            const res = await fetch(`/api/payroll/${payrollId}`, { method: "DELETE" });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              setError(typeof data.error === "string" ? data.error : "删除失败 Failed to delete");
              return;
            }
            if (redirectTo) router.push(redirectTo);
            else router.refresh();
          });
        }}
        className="rounded-md border border-red-200 px-1.5 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        🗑️
      </button>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
