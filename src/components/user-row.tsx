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
  phone,
  icPassport,
  email,
  active,
  bankName,
  bankAccount,
}: {
  id: string;
  name: string;
  username: string;
  role: string;
  staffType: string | null;
  phone: string | null;
  icPassport: string | null;
  email: string | null;
  active: boolean;
  bankName: string | null;
  bankAccount: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [resetInfo, setResetInfo] = useState<string | null>(null);

  return (
    <tr className="border-t border-neutral-100 align-middle">
      <td className="whitespace-nowrap px-3 py-1.5">
        <Link href={`/users/${id}`} className="font-medium hover:underline">
          {name}
        </Link>
        <span className="ml-1.5 text-xs text-neutral-400">{username}</span>
      </td>
      <td className="whitespace-nowrap px-3 py-1.5 capitalize">{role}</td>
      <td className="whitespace-nowrap px-3 py-1.5">{staffType ?? "-"}</td>
      <td className="whitespace-nowrap px-3 py-1.5">{phone ?? "-"}</td>
      <td className="whitespace-nowrap px-3 py-1.5">{icPassport ?? "-"}</td>
      <td className="whitespace-nowrap px-3 py-1.5">{email ?? "-"}</td>
      <td className="whitespace-nowrap px-3 py-1.5">
        {bankName || bankAccount
          ? [bankName, bankAccount].filter(Boolean).join(" · ")
          : "-"}
      </td>
      <td className="whitespace-nowrap px-3 py-1.5">
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
      <td className="whitespace-nowrap px-3 py-1.5">
        <div className="flex items-center gap-2 text-xs">
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
            className="text-neutral-600 underline"
          >
            重置密码 Reset
          </button>
          <span className="text-neutral-300">·</span>
          <Link href={`/users/${id}`} className="text-neutral-600 underline">
            编辑 Edit
          </Link>
        </div>
        {resetInfo ? (
          <p className="mt-1 text-xs">
            新密码 <code className="rounded bg-neutral-100 px-1">{resetInfo}</code>
          </p>
        ) : null}
      </td>
    </tr>
  );
}
