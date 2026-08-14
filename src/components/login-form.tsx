"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { signInWithCredentials } from "@/app/login/actions";
import { Bi } from "@/components/bi";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [error, setError] = useState<{ zh: string; en: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
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
          <Bi zh="用户名" en="Username" />
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
          <Bi zh="密码" en="Password" />
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 pr-10 text-sm outline-none focus:border-purple-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          <Bi zh={error.zh} en={error.en} />
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-purple-700 hover:bg-purple-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? <Bi zh="登录中..." en="Signing in..." /> : <Bi zh="登录" en="Sign in" />}
      </button>
    </form>
  );
}
