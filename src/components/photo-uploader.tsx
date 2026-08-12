"use client";

import { useRef, useState, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import type { PhotoKind } from "@/lib/photos";
import { tryGetPosition, watermarkImage } from "@/lib/watermark";

const KIND_LABEL: Record<PhotoKind, string> = {
  photo: "任务照片 Photo",
  before: "清洁前 Before",
  after: "清洁后 After",
};

export function PhotoUploader({
  jobId,
  kind,
  context,
}: {
  jobId: string;
  kind: PhotoKind;
  context?: { staffName: string; unitName?: string; jobTitle?: string };
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleFile = (file: File) => {
    setError(null);
    startTransition(async () => {
      try {
        const pos = await tryGetPosition();
        const lines = [
          `${context?.jobTitle ?? "Bliss Rooms"} · ${KIND_LABEL[kind]}${context?.unitName ? ` · ${context.unitName}` : ""}`,
          new Date().toLocaleString(),
          ...(pos ? [`GPS ${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`] : []),
          ...(context?.staffName ? [context.staffName] : []),
        ];
        const watermarked = await watermarkImage(file, lines);

        const blob = await upload(`jobs/${jobId}/${kind}-${Date.now()}-${file.name}`, watermarked, {
          access: "private",
          contentType: "image/jpeg",
          handleUploadUrl: `/api/jobs/${jobId}/photo-upload`,
        });

        const res = await fetch(`/api/jobs/${jobId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: blob.url, kind }),
        });
        if (!res.ok) throw new Error("Failed to save photo");

        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  };

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-neutral-600">{KIND_LABEL[kind]}</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={isPending}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        className="block w-full text-sm"
      />
      {isPending ? <p className="text-xs text-neutral-400">上传中... Uploading...</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
