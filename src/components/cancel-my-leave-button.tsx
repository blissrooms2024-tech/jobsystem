"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bi } from "@/components/bi";
import { biText } from "@/lib/lang";

export function CancelMyLeaveButton({ leaveId }: { leaveId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm(biText("确定要取消这个请假申请吗？", "Cancel this leave request?"))) return;
        startTransition(async () => {
          await fetch(`/api/leaves/${leaveId}/cancel`, { method: "POST" });
          router.refresh();
        });
      }}
      className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
    >
      <Bi zh="取消申请" en="Cancel my request" />
    </button>
  );
}
