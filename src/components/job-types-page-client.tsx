"use client";

import { useMemo, useState } from "react";
import { JobTypeRow } from "@/components/job-type-row";
import { NewJobTypeForm } from "@/components/new-job-type-form";

type JobTypeData = {
  id: string;
  typeName: string;
  pay: string;
  active: boolean;
};

export function JobTypesPageClient({ rows }: { rows: JobTypeData[] }) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((jt) => jt.typeName.toLowerCase().includes(q));
  }, [rows, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">工种 Job Types</h1>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索工种... Search"
            className="w-56 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-md bg-purple-700 hover:bg-purple-800 px-3 py-1.5 text-sm font-medium text-white"
          >
            {showAdd ? "取消 Cancel" : "+ 新增工种 Add job type"}
          </button>
        </div>
      </div>

      {showAdd ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <NewJobTypeForm />
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full max-w-lg text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-3 py-2">名称 Name</th>
              <th className="px-3 py-2">单价 Pay</th>
              <th className="px-3 py-2">状态 Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((jt) => (
              <JobTypeRow key={jt.id} id={jt.id} typeName={jt.typeName} pay={jt.pay} active={jt.active} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-sm text-neutral-500">没有符合的工种 No matching job types</p>
        ) : null}
      </div>
    </div>
  );
}
