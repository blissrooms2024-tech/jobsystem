"use client";

import { useRef, useState, useTransition } from "react";
import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { MAX_COMPLETION_PHOTOS, type PhotoKind } from "@/lib/photos";
import { tryGetPosition, watermarkImage } from "@/lib/watermark";
import { Bi } from "@/components/bi";

const KIND_LABEL: Record<PhotoKind, { zh: string; en: string }> = {
  photo: { zh: "任务照片", en: "Photo" },
  before: { zh: "清洁前", en: "Before" },
  after: { zh: "清洁后", en: "After" },
};

type Staged = { file: File; previewUrl: string };

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
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  // Picked files sit here — with a delete button on each — until the admin/
  // employee taps Upload. Nothing is sent to the server until then, so a
  // wrong pick can be removed and swapped for another first.
  const [staged, setStaged] = useState<Staged[]>([]);
  const router = useRouter();

  // Before/after are one comparison shot each; "photo" (no-checkin
  // completion proof) allows up to the job-wide cap.
  const maxStaged = kind === "photo" ? MAX_COMPLETION_PHOTOS : 1;

  const addFiles = (files: File[]) => {
    setError(null);
    setStaged((prev) => {
      const room = Math.max(maxStaged - prev.length, 0);
      const accepted = files.slice(0, room);
      return [...prev, ...accepted.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))];
    });
  };

  const removeStaged = (index: number) => {
    setStaged((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadOne = async (file: File) => {
    const pos = await tryGetPosition();
    const lines = [
      `${context?.jobTitle ?? "Bliss Rooms"} · ${KIND_LABEL[kind].zh} ${KIND_LABEL[kind].en}${context?.unitName ? ` · ${context.unitName}` : ""}`,
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
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(typeof data.error === "string" ? data.error : "Failed to save photo");
    }
  };

  const submit = () => {
    if (staged.length === 0) return;
    setError(null);
    const files = staged.map((s) => s.file);
    startTransition(async () => {
      setProgress({ done: 0, total: files.length });
      try {
        for (let i = 0; i < files.length; i++) {
          await uploadOne(files[i]);
          setProgress({ done: i + 1, total: files.length });
        }
        // Once uploaded, they're committed — clear the staging area (there's
        // no delete for already-uploaded photos).
        staged.forEach((s) => URL.revokeObjectURL(s.previewUrl));
        setStaged([]);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setProgress(null);
      }
    });
  };

  const atLimit = staged.length >= maxStaged;

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-neutral-600">
        <Bi zh={KIND_LABEL[kind].zh} en={KIND_LABEL[kind].en} />
      </label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={kind === "photo"}
        disabled={isPending || atLimit}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) addFiles(files);
          // Reset so picking the exact same file again still fires onChange.
          if (inputRef.current) inputRef.current.value = "";
        }}
        className="hidden"
      />

      {staged.length > 0 ? (
        <div className="grid grid-cols-4 gap-2">
          {staged.map((s, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-md border border-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element -- local blob: preview URL, not a real asset to optimize */}
              <img src={s.previewUrl} alt="" className="h-full w-full object-cover" />
              {!isPending ? (
                <button
                  type="button"
                  onClick={() => removeStaged(i)}
                  aria-label="Remove"
                  className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                >
                  <X size={12} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending || atLimit}
          onClick={() => inputRef.current?.click()}
          className="flex-1 rounded-md bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800 disabled:opacity-50"
        >
          {kind === "photo" ? (
            <Bi
              zh={`📷 选择照片${staged.length > 0 ? `（${staged.length}/${maxStaged}）` : "（可多选）"}`}
              en={`📷 Choose photos${staged.length > 0 ? ` (${staged.length}/${maxStaged})` : ""}`}
            />
          ) : (
            <Bi zh="📷 选择照片" en="📷 Choose photo" />
          )}
        </button>
        {staged.length > 0 ? (
          <button
            type="button"
            disabled={isPending}
            onClick={submit}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {progress ? (
              <Bi zh={`上传中 ${progress.done}/${progress.total}`} en={`Uploading ${progress.done}/${progress.total}`} />
            ) : (
              <Bi zh="上传" en="Upload" />
            )}
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
