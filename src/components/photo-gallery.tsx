"use client";

import { useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { PhotoEntry } from "@/lib/photos";

// Minimum horizontal drag distance (px) before a touch gesture counts as a
// swipe rather than a tap or an accidental wobble.
const SWIPE_THRESHOLD = 40;

export function PhotoGallery({ jobId, photos }: { jobId: string; photos: PhotoEntry[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const proxied = (url: string) => `/api/jobs/${jobId}/photo?url=${encodeURIComponent(url)}`;

  const close = () => setOpenIndex(null);
  const showPrev = () => setOpenIndex((i) => (i === null ? null : (i - 1 + photos.length) % photos.length));
  const showNext = () => setOpenIndex((i) => (i === null ? null : (i + 1) % photos.length));

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta > SWIPE_THRESHOLD) showPrev();
    else if (delta < -SWIPE_THRESHOLD) showNext();
  };

  if (photos.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="aspect-square overflow-hidden rounded-md"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- served through our own proxy, not worth Image optimization config here */}
            <img
              src={proxied(p.url)}
              alt={`${p.kind} ${p.idx + 1}`}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      {openIndex !== null ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X size={22} />
          </button>

          {photos.length > 1 ? (
            <button
              type="button"
              onClick={showPrev}
              aria-label="Previous"
              className="absolute left-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:left-4"
            >
              <ChevronLeft size={26} />
            </button>
          ) : null}

          {/* eslint-disable-next-line @next/next/no-img-element -- served through our own proxy, not worth Image optimization config here */}
          <img
            src={proxied(photos[openIndex].url)}
            alt={`${photos[openIndex].kind} ${photos[openIndex].idx + 1}`}
            className="max-h-[90vh] max-w-[92vw] select-none object-contain"
          />

          {photos.length > 1 ? (
            <button
              type="button"
              onClick={showNext}
              aria-label="Next"
              className="absolute right-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:right-4"
            >
              <ChevronRight size={26} />
            </button>
          ) : null}

          {photos.length > 1 ? (
            <p className="absolute bottom-4 text-sm text-white/70">
              {openIndex + 1} / {photos.length}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
