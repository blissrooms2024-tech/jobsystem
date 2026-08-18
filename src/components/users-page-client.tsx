"use client";

import { useMemo, useState } from "react";
import { UserRow } from "@/components/user-row";
import { NewUserForm } from "@/components/new-user-form";
import { Bi } from "@/components/bi";
import { useLang } from "@/lib/use-lang";
import { matchesQuery } from "@/lib/search";

type UserData = {
  id: string;
  name: string;
  username: string;
  staffId: string | null;
  role: string;
  staffType: string | null;
  phone: string | null;
  icPassport: string | null;
  email: string | null;
  active: boolean;
  bankName: string | null;
  bankAccount: string | null;
};

export function UsersPageClient({ rows }: { rows: UserData[] }) {
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(
    () =>
      rows.filter((u) =>
        matchesQuery([u.name, u.username, u.staffId, u.staffType, u.phone, u.icPassport, u.email], search),
      ),
    [rows, search],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">
          <Bi zh="员工" en="Users" />
        </h1>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("搜索姓名/员工编号/电话...", "Search")}
            className="w-56 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <span className="text-sm text-neutral-500">
            {search ? (
              <Bi zh={`共 ${rows.length} 个，筛选出 ${filtered.length} 个`} en={`${filtered.length} of ${rows.length}`} />
            ) : (
              <Bi zh={`共 ${rows.length} 个`} en={`${rows.length} total`} />
            )}
          </span>
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-md bg-purple-700 hover:bg-purple-800 px-3 py-1.5 text-sm font-medium text-white"
          >
            {showAdd ? (
              <Bi zh="取消" en="Cancel" />
            ) : (
              <>
                + <Bi zh="新增员工" en="Add employee" />
              </>
            )}
          </button>
        </div>
      </div>

      {showAdd ? (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <NewUserForm />
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-3 py-2"><Bi zh="姓名" en="Name" /></th>
              <th className="px-3 py-2"><Bi zh="员工编号" en="Staff ID" /></th>
              <th className="px-3 py-2"><Bi zh="类型" en="Staff type" /></th>
              <th className="px-3 py-2"><Bi zh="电话" en="Phone" /></th>
              <th className="px-3 py-2"><Bi zh="银行资料" en="Bank" /></th>
              <th className="px-3 py-2"><Bi zh="状态" en="Status" /></th>
              <th className="px-3 py-2"><Bi zh="操作" en="Actions" /></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <UserRow
                key={u.id}
                id={u.id}
                name={u.name}
                username={u.username}
                staffId={u.staffId}
                staffType={u.staffType}
                phone={u.phone}
                active={u.active}
                bankName={u.bankName}
                bankAccount={u.bankAccount}
              />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-sm text-neutral-500">
            <Bi zh="没有符合的员工" en="No matching employees" />
          </p>
        ) : null}
      </div>
    </div>
  );
}
