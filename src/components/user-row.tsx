"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Bi } from "@/components/bi";
import { useLang } from "@/lib/use-lang";

export function UserRow({
  id,
  name,
  username,
  staffId,
  staffType,
  phone,
  active,
  bankName,
  bankAccount,
}: {
  id: string;
  name: string;
  username: string;
  staffId: string | null;
  staffType: string | null;
  phone: string | null;
  active: boolean;
  bankName: string | null;
  bankAccount: string | null;
}) {
  const router = useRouter();
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [isPending, startTransition] = useTransition();
  const [resetInfo, setResetInfo] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  return (
    <tr
      className="cursor-pointer border-t border-neutral-100 align-middle hover:bg-purple-50"
      onClick={() => router.push(`/users/${id}`)}
    >
      <td className="whitespace-nowrap px-3 py-1.5">
        <Link href={`/users/${id}`} className="font-medium text-purple-700 hover:underline">
          {name}
        </Link>
        <span className="ml-1.5 text-xs text-neutral-400">{username}</span>
      </td>
      <td className="whitespace-nowrap px-3 py-1.5">{staffId ?? "-"}</td>
      <td className="whitespace-nowrap px-3 py-1.5">{staffType ?? "-"}</td>
      <td className="whitespace-nowrap px-3 py-1.5">{phone ?? "-"}</td>
      <td className="whitespace-nowrap px-3 py-1.5">
        {bankName || bankAccount
          ? [bankName, bankAccount].filter(Boolean).join(" · ")
          : "-"}
      </td>
      <td className="whitespace-nowrap px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
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
          <Bi zh={active ? "在职" : "停用"} en={active ? "Active" : "Inactive"} />
        </button>
      </td>
      <td className="whitespace-nowrap px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={isPending}
            title={t("重置密码", "Reset password")}
            aria-label={t("重置密码", "Reset password")}
            onClick={() => {
              startTransition(async () => {
                const res = await fetch(`/api/users/${id}/reset-password`, { method: "POST" });
                if (res.ok) {
                  const data = await res.json();
                  setResetInfo(data.tempPassword);
                }
              });
            }}
            className="rounded-md border border-neutral-200 px-1.5 py-1 text-sm hover:bg-neutral-50"
          >
            🔑
          </button>
          <Link
            href={`/users/${id}`}
            title={t("编辑更多资料", "Edit full profile")}
            aria-label={t("编辑更多资料", "Edit full profile")}
            className="rounded-md border border-neutral-200 px-1.5 py-1 text-sm hover:bg-neutral-50"
          >
            ✏️
          </Link>
          <button
            type="button"
            disabled={isPending}
            title={t("删除账号", "Delete account")}
            aria-label={t("删除账号", "Delete account")}
            onClick={() => {
              if (
                !confirm(
                  t(`确定要删除 ${name} 的账号吗？此操作无法撤销。`, `Delete ${name}'s account? This can't be undone.`),
                )
              ) {
                return;
              }
              setDeleteError(null);
              startTransition(async () => {
                const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  setDeleteError(typeof data.error === "string" ? data.error : t("删除失败", "Failed to delete"));
                  return;
                }
                router.refresh();
              });
            }}
            className="rounded-md border border-red-200 px-1.5 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
        {resetInfo ? (
          <p className="mt-1 text-xs">
            新密码 <code className="rounded bg-neutral-100 px-1">{resetInfo}</code>
          </p>
        ) : null}
        {deleteError ? <p className="mt-1 text-xs text-red-600">{deleteError}</p> : null}
      </td>
    </tr>
  );
}
