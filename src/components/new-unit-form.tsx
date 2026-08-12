"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bi } from "@/components/bi";

export function NewUnitForm() {
  const router = useRouter();
  const [error, setError] = useState<React.ReactNode>(null);
  const [isPending, startTransition] = useTransition();
  const latRef = useRef<HTMLInputElement>(null);
  const lonRef = useRef<HTMLInputElement>(null);

  const grabHere = () => {
    setError(null);
    if (!navigator.geolocation) {
      setError(<Bi zh="此设备不支持定位" en="Geolocation not supported" />);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (latRef.current) latRef.current.value = pos.coords.latitude.toFixed(6);
        if (lonRef.current) lonRef.current.value = pos.coords.longitude.toFixed(6);
      },
      (err) => setError(err.message || <Bi zh="无法获取定位" en="Could not get location" />),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <form
      className="grid max-w-lg grid-cols-2 gap-3"
      action={(formData: FormData) => {
        setError(null);
        startTransition(async () => {
          const payload = Object.fromEntries(formData.entries());
          const res = await fetch("/api/units", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            setError(<Bi zh="创建失败" en="Failed to create" />);
            return;
          }
          router.refresh();
          (document.getElementById("new-unit-form") as HTMLFormElement)?.reset();
        });
      }}
      id="new-unit-form"
    >
      <input name="unitCode" placeholder="单位编号 Unit code" required className="input" />
      <input name="unitName" placeholder="单位名称 Unit name" required className="input" />
      <input name="property" placeholder="物业 Property" className="input" />
      <input name="address" placeholder="地址 Address" className="input" />
      <input ref={latRef} name="lat" type="number" step="0.000001" placeholder="Lat" defaultValue={0} className="input" />
      <input ref={lonRef} name="lon" type="number" step="0.000001" placeholder="Lon" defaultValue={0} className="input" />
      <input name="radiusM" type="number" placeholder="打卡半径(m) Radius" defaultValue={200} className="input" />
      <button
        type="button"
        onClick={grabHere}
        className="col-span-2 rounded-md border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-50"
      >
        📍 <Bi zh="使用当前定位" en="Use my current location" />
      </button>
      {error ? <p className="col-span-2 text-sm text-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="col-span-2 rounded-md bg-purple-700 hover:bg-purple-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? (
          "创建中..."
        ) : (
          <>
            + <Bi zh="新增单位" en="Add unit" />
          </>
        )}
      </button>
      <style jsx>{`
        .input {
          border: 1px solid #d4d4d4;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 14px;
        }
      `}</style>
    </form>
  );
}
