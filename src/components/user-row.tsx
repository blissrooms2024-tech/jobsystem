"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function UserRow({
  id,
  name,
  username,
  role,
  staffType,
  active,
  bankName,
  bankAccount,
}: {
  id: string;
  name: string;
  username: string;
  role: string;
  staffType: string | null;
  active: boolean;
  bankName: string | null;
  bankAccount: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [resetInfo, setResetInfo] = useState<string | null>(null);

  return (
    <tr className="border-t border-neutral-100 align-top">
      <td className="px-3 py-2">
        <Link href={`/users/${id}`} className="font-medium hover:underline">
          {name}
        </Link>
        <p className="text-xs text-neutral-400">{username}</p>
      </td>
      <td className="px-3 py-2 capitalize">{role}</td>
      <td className="px-3 py-2">{staffType ?? "-"}</td>
      <td className="px-3 py-2">
        {bankName || bankAccount ? (
          <>
            <p>{bankName ?? "-"}</p>
            <p className="text-xs text-neutral-400">{bankAccount ?? "-"}</p>
          </>
        ) : (
          "-"
        )}
      </td>
      <td className="px-3 py-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await fetch(`/api/users/${id}`, {
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
          {active ? "在职 Active" : "停用 Inactive"}
        </button>
      </td>
      <td className="px-3 py-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const res = await fetch(`/api/users/${id}/reset-password`, { method: "POST" });
              if (res.ok) {
                const data = await res.json();
                setResetInfo(data.tempPassword);
              }
            });
          }}
          className="text-xs text-neutral-600 underline"
        >
          重置密码 Reset password
        </button>
        {resetInfo ? (
          <p className="mt-1 text-xs">
            新密码 <code className="rounded bg-neutral-100 px-1">{resetInfo}</code>
          </p>
        ) : null}
      </td>
    </tr>
  );
}
