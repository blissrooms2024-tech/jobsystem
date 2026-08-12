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

const STATUS_NOTE: Record<string, string> = {
  completed: "此任务已完成 Job completed",
  cancelled: "此任务已取消 Job cancelled",
  missed: "此任务已错过 Job missed — ask an admin to reopen it",
};

export function JobCheckinActions({
  jobId,
  needCheckin,
  status,
  photoCount,
  requiredPhotos,
}: {
  jobId: string;
  needCheckin: boolean;
  status: string;
  photoCount: number;
  requiredPhotos: number;
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

  if (status !== "assigned" && status !== "in_progress") {
    return <p className="text-sm text-neutral-600">{STATUS_NOTE[status] ?? status}</p>;
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {needCheckin ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isPending || status !== "assigned" || photoCount < 1}
            onClick={() => call("checkin", true)}
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {status === "in_progress" ? "已打卡上班 Checked in" : "打卡上班 Check in"}
          </button>
          <button
            type="button"
            disabled={isPending || status !== "in_progress" || photoCount < 1}
            onClick={() => call("checkout", true)}
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            打卡下班 & 完成 Check out & complete
          </button>
          {status === "assigned" && photoCount < 1 ? (
            <p className="w-full text-xs text-neutral-500">请先上传照片才能打卡 Upload a photo before checking in</p>
          ) : null}
        </div>
      ) : (
        <div>
          <button
            type="button"
            disabled={isPending || photoCount < requiredPhotos}
            onClick={() => call("complete", true)}
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            标记完成 Mark complete
          </button>
          {requiredPhotos > 0 && photoCount < requiredPhotos ? (
            <p className="mt-1 text-xs text-neutral-500">
              还需 {requiredPhotos - photoCount} 张照片 Need {requiredPhotos - photoCount} more photo(s) (
              {photoCount}/{requiredPhotos})
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
