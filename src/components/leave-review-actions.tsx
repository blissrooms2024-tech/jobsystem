"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bi } from "@/components/bi";
import { biText } from "@/lib/lang";
import { useLang } from "@/lib/use-lang";

export function LeaveReviewActions({ leaveId, status }: { leaveId: string; status: string }) {
  const router = useRouter();
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();

  const review = (decision: "approved" | "rejected" | "cancelled") => {
    startTransition(async () => {
      await fetch(`/api/leaves/${leaveId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reviewNote: note || undefined }),
      });
      router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={t("审批备注", "Review note (optional)")}
        rows={2}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      <div className="flex flex-wrap gap-2">
        {status === "pending" ? (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() => review("approved")}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              <Bi zh="批准" en="Approve" />
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => review("rejected")}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              <Bi zh="拒绝" en="Reject" />
            </button>
          </>
        ) : null}
        {status === "approved" ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (confirm(biText("确定要撤销这个已批准的请假吗？", "Cancel this approved leave?")))
                review("cancelled");
            }}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
          >
            <Bi zh="撤销" en="Cancel this leave" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
