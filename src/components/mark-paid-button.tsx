"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bi } from "@/components/bi";

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
      {isPending ? <Bi zh="处理中..." en="Processing..." /> : <Bi zh="标记已发放" en="Mark as paid" />}
    </button>
  );
}
