"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
          <button type="button" onClick={() => setEditing(true)} className="text-xs text-neutral-600 underline">
            编辑 Edit
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
                setError("保存失败 Failed to save");
                return;
              }
              setEditing(false);
              router.refresh();
            });
          }}
        >
          <input name="unitName" defaultValue={props.unitName} className="edit-input w-32" />
          <input name="property" defaultValue={props.property ?? ""} placeholder="Property" className="edit-input w-24" />
          <input name="lat" type="number" step="0.000001" defaultValue={props.lat} className="edit-input w-24" />
          <input name="lon" type="number" step="0.000001" defaultValue={props.lon} className="edit-input w-24" />
          <input name="radiusM" type="number" defaultValue={props.radiusM} className="edit-input w-16" />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-neutral-900 px-2 py-1 text-xs text-white disabled:opacity-60"
          >
            保存
          </button>
          <button type="button" onClick={() => setEditing(false)} className="text-xs text-neutral-500">
            取消
          </button>
          {error ? <span className="text-xs text-red-600">{error}</span> : null}
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
