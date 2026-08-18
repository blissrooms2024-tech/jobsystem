"use client";

import { useMemo, useState } from "react";
import { Bi } from "@/components/bi";
import { useLang } from "@/lib/use-lang";
import { matchesQuery } from "@/lib/search";

type Row = {
  id: string;
  name: string;
  staffId: string | null;
  staffType: string | null;
  phone: string | null;
  active: boolean;
};

export function TeamListClient({ rows }: { rows: Row[] }) {
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => rows.filter((r) => matchesQuery([r.name, r.staffId, r.staffType, r.phone], search)),
    [rows, search],
  );

  return (
    <div className="space-y-4">
      {rows.length > 0 ? (
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("搜索姓名/编号/电话...", "Search name/ID/phone")}
          className="w-64 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
        />
      ) : null}
      {rows.length > 0 ? (
        <span className="text-sm text-neutral-500">
          {search ? (
            <Bi zh={`共 ${rows.length} 个，筛选出 ${filtered.length} 个`} en={`${filtered.length} of ${rows.length}`} />
          ) : (
            <Bi zh={`共 ${rows.length} 个`} en={`${rows.length} total`} />
          )}
        </span>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-3 py-2"><Bi zh="姓名" en="Name" /></th>
              <th className="px-3 py-2"><Bi zh="员工编号" en="Staff ID" /></th>
              <th className="px-3 py-2"><Bi zh="类型" en="Type" /></th>
              <th className="px-3 py-2"><Bi zh="电话" en="Phone" /></th>
              <th className="px-3 py-2"><Bi zh="状态" en="Status" /></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-neutral-100 whitespace-nowrap">
                <td className="px-3 py-2 font-medium">{r.name}</td>
                <td className="px-3 py-2">{r.staffId ?? "-"}</td>
                <td className="px-3 py-2">{r.staffType ?? "-"}</td>
                <td className="px-3 py-2">{r.phone ?? "-"}</td>
                <td className="px-3 py-2">
                  <Bi zh={r.active ? "在职" : "停用"} en={r.active ? "Active" : "Inactive"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-sm text-neutral-500">
            {rows.length === 0 ? (
              <Bi zh="暂无下属" en="No subordinates yet" />
            ) : (
              <Bi zh="没有符合的员工" en="No matching staff" />
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}
