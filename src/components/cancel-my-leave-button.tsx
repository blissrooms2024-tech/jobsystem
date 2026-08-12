"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function CancelMyLeaveButton({ leaveId }: { leaveId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("确定要取消这个请假申请吗？\nCancel this leave request?")) return;
        startTransition(async () => {
          await fetch(`/api/leaves/${leaveId}/cancel`, { method: "POST" });
          router.refresh();
        });
      }}
      className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60"
    >
      取消申请 Cancel my request
    </button>
  );
}
