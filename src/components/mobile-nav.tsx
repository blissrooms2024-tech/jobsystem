"use client";

import { useState } from "react";
import { DashboardNav } from "@/components/dashboard-nav";
import type { Role } from "@/types/next-auth";

export function MobileNav({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-2 sm:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="菜单 Menu"
        className="rounded-md border border-neutral-300 px-2 py-1.5 text-neutral-700"
      >
        ☰
      </button>
      <p className="text-sm font-semibold text-neutral-900">Bliss Rooms</p>

      {open ? (
        <div className="fixed inset-0 z-50 flex">
          <div className="w-64 max-w-[80vw] space-y-6 bg-white p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-900">Bliss Rooms</p>
                <p className="text-xs text-neutral-500">Job System</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭 Close"
                className="text-neutral-500"
              >
                ✕
              </button>
            </div>
            <DashboardNav role={role} />
          </div>
          <button
            type="button"
            aria-label="关闭菜单 Close menu"
            onClick={() => setOpen(false)}
            className="flex-1 bg-black/30"
          />
        </div>
      ) : null}
    </div>
  );
}
