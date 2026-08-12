"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bi } from "@/components/bi";
import { useLang } from "@/lib/use-lang";

type Props = {
  id: string;
  unitCode: string;
  unitName: string;
  property: string | null;
  lat: number;
  lon: number;
  radiusM: number;
};

export function UnitRow(props: Props) {
  const router = useRouter();
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [editing, setEditing] = useState(false);
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

  if (!editing) {
    return (
      <tr className="border-t border-neutral-100">
        <td className="px-3 py-2">{props.unitCode}</td>
        <td className="px-3 py-2">{props.unitName}</td>
        <td className="px-3 py-2">{props.property}</td>
        <td className="px-3 py-2">
          {props.lat}, {props.lon}
        </td>
        <td className="px-3 py-2">{props.radiusM}m</td>
        <td className="px-3 py-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            title={t("编辑", "Edit")}
            aria-label={t("编辑", "Edit")}
            className="rounded-md border border-neutral-200 px-1.5 py-1 text-sm hover:bg-neutral-50"
          >
            ✏️
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-neutral-100 bg-neutral-50">
      <td className="px-3 py-2 text-neutral-400">{props.unitCode}</td>
      <td colSpan={5} className="px-3 py-2">
        <form
          className="flex flex-wrap items-center gap-2"
          action={(formData: FormData) => {
            setError(null);
            startTransition(async () => {
              const res = await fetch(`/api/units/${props.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  unitName: String(formData.get("unitName") || ""),
                  property: String(formData.get("property") || ""),
                  lat: String(formData.get("lat") || "0"),
                  lon: String(formData.get("lon") || "0"),
                  radiusM: String(formData.get("radiusM") || "200"),
                }),
              });
              if (!res.ok) {
                setError(<Bi zh="保存失败" en="Failed to save" />);
                return;
              }
              setEditing(false);
              router.refresh();
            });
          }}
        >
          <input name="unitName" defaultValue={props.unitName} className="edit-input w-32" />
          <input name="property" defaultValue={props.property ?? ""} placeholder="Property" className="edit-input w-24" />
          <input ref={latRef} name="lat" type="number" step="0.000001" defaultValue={props.lat} className="edit-input w-24" />
          <input ref={lonRef} name="lon" type="number" step="0.000001" defaultValue={props.lon} className="edit-input w-24" />
          <input name="radiusM" type="number" defaultValue={props.radiusM} className="edit-input w-16" />
          <button type="button" onClick={grabHere} className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-white">
            📍 <Bi zh="当前定位" en="Use location" />
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-purple-700 hover:bg-purple-800 px-2 py-1 text-xs text-white disabled:opacity-60"
          >
            保存
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-xs text-neutral-500">
            取消
          </button>
          {error ? <span className="w-full text-xs text-red-600">{error}</span> : null}
          <style jsx>{`
            .edit-input {
              border: 1px solid #d4d4d4;
              border-radius: 4px;
              padding: 4px 6px;
              font-size: 12px;
            }
          `}</style>
        </form>
      </td>
    </tr>
  );
}
