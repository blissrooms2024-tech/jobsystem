"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/utils";
import { Bi } from "@/components/bi";

export function JobTypeRow({
  id,
  typeName,
  pay,
  active,
}: {
  id: string;
  typeName: string;
  pay: string;
  active: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <tr className="border-t border-neutral-100">
      <td className="px-3 py-2">{typeName}</td>
      <td className="px-3 py-2">{formatMoney(pay)}</td>
      <td className="px-3 py-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await fetch(`/api/job-types/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ active: !active }),
              });
              router.refresh();
            });
          }}
          className={
            active
              ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
              : "rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600"
          }
        >
          <Bi zh={active ? "启用中" : "已停用"} en={active ? "Active" : "Inactive"} />
        </button>
      </td>
    </tr>
  );
}
