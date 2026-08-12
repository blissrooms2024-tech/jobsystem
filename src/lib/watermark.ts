"use client";

/**
 * Burns timestamp/location/context text onto a photo before upload — the
 * legacy system's anti-cheat measure (a check-in photo with no burned-in
 * proof of when/where it was taken is easy to fake or reuse). Runs entirely
 * client-side via canvas; resizes to a max dimension so uploads stay small.
 */
export function watermarkImage(file: File, lines: string[]): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read photo"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not decode photo"));
      img.onload = () => {
        const maxDim = 1280;
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);

        const fontSize = Math.max(13, Math.round(w / 38));
        ctx.font = `bold ${fontSize}px sans-serif`;
        const lineHeight = fontSize + 6;
        const barHeight = lines.length * lineHeight + 10;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, h - barHeight, w, barHeight);
        ctx.fillStyle = "#fff";
        ctx.textBaseline = "top";
        lines.forEach((line, i) => {
          ctx.fillText(line, 10, h - barHeight + 8 + i * lineHeight);
        });

        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode photo"))),
          "image/jpeg",
          0.85,
        );
      };
      img.src = String(e.target?.result);
    };
    reader.readAsDataURL(file);
  });
}

/** Best-effort GPS grab with a short timeout — never blocks the watermark on a denial. */
export function tryGetPosition(timeoutMs = 4000): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }
    const timer = setTimeout(() => resolve(null), timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve(pos);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: timeoutMs },
    );
  });
}
