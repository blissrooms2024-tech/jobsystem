"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { setUnreadCount } from "@/lib/use-unread";

const POLL_MS = 15000;

/**
 * Mounted once in the dashboard shell — polls total unread chat messages
 * for the nav badge, and fires a browser Notification popup when the count
 * goes up while the tab isn't focused (so it doesn't nag while you're
 * already looking at the app).
 */
export function ChatNotifier() {
  const prevTotal = useRef<number | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const poll = async () => {
      const res = await fetch("/api/chat/unread");
      if (!res.ok) return;
      const data = await res.json();
      const total: number = data.total ?? 0;
      setUnreadCount(total);

      if (
        prevTotal.current !== null &&
        total > prevTotal.current &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        !document.hasFocus()
      ) {
        const n = new Notification("Bliss Rooms Chat", {
          body: "You have a new message",
          tag: "bliss-rooms-chat",
        });
        n.onclick = () => {
          window.focus();
          router.push("/chat");
        };
      }
      prevTotal.current = total;
    };
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
    // Deliberately excludes `router` (stable from next/navigation) and
    // `pathname` (only read to force a re-poll right after navigating into
    // a chat room, so the badge clears promptly instead of waiting up to
    // POLL_MS).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
