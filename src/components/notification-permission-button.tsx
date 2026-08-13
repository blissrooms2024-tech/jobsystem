"use client";

import { useState, useSyncExternalStore } from "react";
import { Bell } from "lucide-react";
import { useLang } from "@/lib/use-lang";

// No native "permissionchange" event to subscribe to across browsers — this
// only needs the value at hydration time, then a manual dismiss after the
// user acts. useSyncExternalStore (not useEffect+setState) avoids a
// server/client hydration mismatch on that first read.
function subscribe() {
  return () => {};
}
function getSnapshot(): NotificationPermission | "unsupported" {
  return typeof Notification !== "undefined" ? Notification.permission : "unsupported";
}
function getServerSnapshot(): NotificationPermission | "unsupported" {
  return "unsupported";
}

export function NotificationPermissionButton() {
  const permission = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [dismissed, setDismissed] = useState(false);
  const lang = useLang();

  if (dismissed || permission === "unsupported" || permission === "granted") return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await Notification.requestPermission();
        setDismissed(true);
      }}
      className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-xs hover:bg-neutral-50"
    >
      <Bell size={14} /> {lang === "en" ? "Enable notifications" : "开启通知"}
    </button>
  );
}
