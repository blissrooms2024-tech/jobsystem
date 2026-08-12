"use client";

import { useMemo, useState } from "react";
import { UnitRow } from "@/components/unit-row";
import { NewUnitForm } from "@/components/new-unit-form";

type UnitData = {
  id: string;
  unitCode: string;
  unitName: string;
  property: string | null;
  lat: number;
  lon: number;
  radiusM: number;
};

export function UnitsPageClient({ rows }: { rows: UnitData[] }) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((u) =>
      [u.unitCode, u.unitName, u.property].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">单位 Units</h1>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索编号/名称/物业... Search"
            className="w-56 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-md bg-purple-700 hover:bg-purple-800 px-3 py-1.5 text-sm font-medium text-white"
          >
            {showAdd ? "取消 Cancel" : "+ 新增单位 Add unit"}
          </button>
        </div>
      </div>

      {showAdd ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <NewUnitForm />
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-3 py-2">编号 Code</th>
              <th className="px-3 py-2">名称 Name</th>
              <th className="px-3 py-2">物业 Property</th>
              <th className="px-3 py-2">坐标 Lat/Lon</th>
              <th className="px-3 py-2">半径 Radius</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <UnitRow
                key={u.id}
                id={u.id}
                unitCode={u.unitCode}
                unitName={u.unitName}
                property={u.property}
                lat={u.lat}
                lon={u.lon}
                radiusM={u.radiusM}
              />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-sm text-neutral-500">没有符合的单位 No matching units</p>
        ) : null}
      </div>
    </div>
  );
}
