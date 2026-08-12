"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function UnpayButton({ payrollId }: { payrollId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("撤销已发放状态？关联的任务也会解除关联。\nRevert this payslip to draft?")) return;
        startTransition(async () => {
          const res = await fetch(`/api/payroll/${payrollId}/unpay`, { method: "POST" });
          if (res.ok) router.refresh();
        });
      }}
      className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
    >
      {isPending ? "处理中... Processing..." : "撤销发放 Unpay"}
    </button>
  );
}
