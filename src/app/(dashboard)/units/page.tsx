import { db } from "@/db";
import { units } from "@/db/schema";
import { NewUnitForm } from "@/components/new-unit-form";

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
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-neutral-100">
                <td className="px-3 py-2">{u.unitCode}</td>
                <td className="px-3 py-2">{u.unitName}</td>
                <td className="px-3 py-2">{u.property}</td>
                <td className="px-3 py-2">
                  {u.lat}, {u.lon}
                </td>
                <td className="px-3 py-2">{u.radiusM}m</td>
              </tr>
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
