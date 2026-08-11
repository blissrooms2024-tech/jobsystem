"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

function getLocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("此设备不支持定位 Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
    });
  });
}

export function JobCheckinActions({
  jobId,
  needCheckin,
  hasCheckedIn,
  hasCheckedOut,
  isCompleted,
}: {
  jobId: string;
  needCheckin: boolean;
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  isCompleted: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const call = (path: string, includeLocation: boolean) => {
    setError(null);
    startTransition(async () => {
      try {
        let body: { lat?: number; lon?: number } = {};
        if (includeLocation) {
          try {
            const pos = await getLocation();
            body = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          } catch {
            // Location denied/unavailable — proceed without it, server just
            // won't be able to compute a distance for this event.
          }
        }
        const res = await fetch(`/api/jobs/${jobId}/${path}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "操作失败 Action failed");
        }
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "操作失败 Action failed");
      }
    });
  };

  if (isCompleted) {
    return <p className="text-sm text-emerald-700">此任务已完成 Job completed</p>;
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {needCheckin ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending || hasCheckedIn}
            onClick={() => call("checkin", true)}
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {hasCheckedIn ? "已打卡上班 Checked in" : "打卡上班 Check in"}
          </button>
          <button
            type="button"
            disabled={isPending || !hasCheckedIn || hasCheckedOut}
            onClick={() => call("checkout", true)}
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {hasCheckedOut ? "已打卡下班 Checked out" : "打卡下班 & 完成 Check out & complete"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={isPending}
          onClick={() => call("complete", true)}
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          标记完成 Mark complete
        </button>
      )}
    </div>
  );
}
