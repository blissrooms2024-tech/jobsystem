"use client";

import { useEffect } from "react";

const HEARTBEAT_MS = 20000;

/** Mounted once in the dashboard shell — periodically marks this user "online" for chat presence. */
export function PresenceHeartbeat() {
  useEffect(() => {
    const ping = () => {
      fetch("/api/presence", { method: "POST" }).catch(() => {});
    };
    ping();
    const interval = setInterval(ping, HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, []);

  return null;
}
