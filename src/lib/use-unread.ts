"use client";

import { useSyncExternalStore } from "react";

let unread = 0;
const listeners = new Set<() => void>();

export function setUnreadCount(n: number) {
  if (n === unread) return;
  unread = n;
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return unread;
}

function getServerSnapshot() {
  return 0;
}

/** Total unread chat message count across all of the user's groups, kept fresh by ChatNotifier's polling. */
export function useUnreadCount(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
