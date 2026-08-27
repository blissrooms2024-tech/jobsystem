"use client";

import { useEffect, useState } from "react";
import { Bi } from "@/components/bi";

type Notice = { id: string; title: string; content: string | null };

const STORAGE_KEY = "noticePopupShownIds";

export function NoticePopup({ notices }: { notices: Notice[] }) {
  const [visible, setVisible] = useState(false);
  const currentIds = notices
    .map((n) => n.id)
    .sort()
    .join(",");

  useEffect(() => {
    if (!currentIds) return;
    let seen = false;
    try {
      seen = sessionStorage.getItem(STORAGE_KEY) === currentIds;
    } catch {
      seen = false;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deferring to sessionStorage (a browser-only API unavailable during SSR) is exactly what this effect is for
    setVisible(!seen);
  }, [currentIds]);

  const dismiss = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, currentIds);
    } catch {
      // ignore — worst case the popup reappears next navigation
    }
    setVisible(false);
  };

  if (!visible || notices.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <div className="space-y-3">
          {notices.map((n) => (
            <div key={n.id}>
              <p className="font-semibold text-neutral-900">{n.title}</p>
              {n.content ? <p className="mt-1 text-sm text-neutral-600">{n.content}</p> : null}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="mt-4 w-full rounded-md bg-purple-700 hover:bg-purple-800 px-4 py-2 text-sm font-medium text-white"
        >
          <Bi zh="知道了" en="Got it" />
        </button>
      </div>
    </div>
  );
}
