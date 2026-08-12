import { db } from "@/db";
import { units } from "@/db/schema";
import { NewUnitForm } from "@/components/new-unit-form";
import { UnitRow } from "@/components/unit-row";

export default async function UnitsPage() {
  const rows = await db.select().from(units);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">单位 Units</h1>

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
            {rows.map((u) => (
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
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">新增单位 Add unit</h2>
        <NewUnitForm />
      </div>
    </div>
  );
}
