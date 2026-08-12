"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ChangePasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="max-w-sm space-y-4"
      action={(formData: FormData) => {
        setError(null);
        setOk(false);
        startTransition(async () => {
          const res = await fetch("/api/account/change-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              currentPassword: String(formData.get("currentPassword") || ""),
              newPassword: String(formData.get("newPassword") || ""),
            }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setError(data.error ?? "修改失败 Failed to change password");
            return;
          }
          setOk(true);
          router.refresh();
        });
      }}
    >
      <div className="space-y-1">
        <label className="text-sm font-medium">当前密码 Current password</label>
        <input
          type="password"
          name="currentPassword"
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium">新密码 New password</label>
        <input
          type="password"
          name="newPassword"
          required
          minLength={6}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {ok ? <p className="text-sm text-emerald-700">密码已更新 Password updated</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-purple-700 hover:bg-purple-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "保存中... Saving..." : "更新密码 Update password"}
      </button>
    </form>
  );
}
