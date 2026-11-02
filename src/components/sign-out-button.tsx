"use client";

import { useTransition } from "react";
import { signOutAction } from "@/app/(dashboard)/actions";
import { Bi } from "@/components/bi";

export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await signOutAction();
          // Deliberate full page load — see signOutAction for why.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/login");
        })
      }
      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-60 sm:border-purple-600 sm:text-white sm:hover:bg-purple-800"
    >
      <Bi zh="登出" en="Sign out" />
    </button>
  );
}
