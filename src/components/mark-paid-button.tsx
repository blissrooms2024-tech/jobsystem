"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function MarkPaidButton({ payrollId }: { payrollId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const res = await fetch(`/api/payroll/${payrollId}/mark-paid`, { method: "POST" });
          if (res.ok) router.refresh();
        });
      }}
      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
    >
      {isPending ? "处理中... Processing..." : "标记已发放 Mark as paid"}
    </button>
  );
}
