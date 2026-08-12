"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithCredentials } from "@/app/login/actions";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="w-full max-w-sm space-y-4"
      action={(formData: FormData) => {
        setError(null);
        startTransition(async () => {
          const result = await signInWithCredentials(formData);
          if (result?.error) {
            setError(result.error);
            return;
          }
          router.push(callbackUrl);
          router.refresh();
        });
      }}
    >
      <div className="space-y-1">
        <label htmlFor="username" className="text-sm font-medium">
          用户名 / Username
        </label>
        <input
          id="username"
          name="username"
          required
          autoComplete="username"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium">
          密码 / Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-purple-500"
        />
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-purple-700 hover:bg-purple-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "登录中... / Signing in..." : "登录 / Sign in"}
      </button>
    </form>
  );
}
