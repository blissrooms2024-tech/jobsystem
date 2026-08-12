"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bi } from "@/components/bi";
import { biText } from "@/lib/lang";

export function UnpayButton({ payrollId }: { payrollId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm(biText("撤销已发放状态？关联的任务也会解除关联。", "Revert this payslip to draft?"))) return;
        startTransition(async () => {
          const res = await fetch(`/api/payroll/${payrollId}/unpay`, { method: "POST" });
          if (res.ok) router.refresh();
        });
      }}
      className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
    >
      {isPending ? <Bi zh="处理中..." en="Processing..." /> : <Bi zh="撤销发放" en="Unpay" />}
    </button>
  );
}
