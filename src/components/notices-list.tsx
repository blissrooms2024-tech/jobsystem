"use client";

import { useState } from "react";
import { Bi } from "@/components/bi";

type Notice = { id: string; title: string; content: string | null };

export function NoticesList({ notices }: { notices: Notice[] }) {
  const [open, setOpen] = useState<Notice | null>(null);

  return (
    <div className="space-y-2">
      {notices.map((n) => (
        <button
          key={n.id}
          type="button"
          onClick={() => setOpen(n)}
          className="block w-full rounded-lg border border-neutral-200 p-3 text-left hover:bg-neutral-50"
        >
          <p className="font-medium">{n.title}</p>
          {n.content ? <p className="mt-1 line-clamp-2 text-sm text-neutral-600">{n.content}</p> : null}
        </button>
      ))}

      {open ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(null)}
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-lg font-semibold">{open.title}</p>
            {open.content ? <p className="mt-2 text-sm whitespace-pre-wrap text-neutral-600">{open.content}</p> : null}
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="mt-4 w-full rounded-md bg-purple-700 hover:bg-purple-800 px-4 py-2 text-sm font-medium text-white"
            >
              <Bi zh="关闭" en="Close" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
