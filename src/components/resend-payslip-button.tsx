"use client";

import { useState, useTransition } from "react";
import { Bi } from "@/components/bi";

export function ResendPayslipButton({ payrollId }: { payrollId: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<React.ReactNode>(null);

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const res = await fetch(`/api/payroll/${payrollId}/resend`, { method: "POST" });
            const data = await res.json().catch(() => null);
            if (res.ok) {
              setMessage(<Bi zh="已重新发送" en="Resent" />);
            } else {
              setMessage(typeof data?.error === "string" ? data.error : "发送失败 Failed to send");
            }
          });
        }}
        className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-60"
      >
        {isPending ? <Bi zh="发送中..." en="Sending..." /> : <Bi zh="重新发送" en="Resend email" />}
      </button>
      {message ? <p className="mt-1 text-xs text-neutral-500">{message}</p> : null}
    </div>
  );
}
