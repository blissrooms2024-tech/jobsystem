"use client";

import { useMemo, useState } from "react";
import { UserRow } from "@/components/user-row";
import { NewUserForm } from "@/components/new-user-form";

type UserData = {
  id: string;
  name: string;
  username: string;
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
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((u) =>
      [u.name, u.username, u.staffType, u.phone, u.icPassport, u.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold">员工 Users</h1>
        <div className="flex items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索姓名/用户名/电话... Search"
            className="w-56 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            {showAdd ? "取消 Cancel" : "+ 新增员工 Add employee"}
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
              <th className="px-3 py-2">姓名 Name</th>
              <th className="px-3 py-2">角色 Role</th>
              <th className="px-3 py-2">类型 Staff type</th>
              <th className="px-3 py-2">电话 Phone</th>
              <th className="px-3 py-2">IC / 护照</th>
              <th className="px-3 py-2">邮箱 Email</th>
              <th className="px-3 py-2">银行资料 Bank</th>
              <th className="px-3 py-2">状态 Status</th>
              <th className="px-3 py-2">操作 Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <UserRow
                key={u.id}
                id={u.id}
                name={u.name}
                username={u.username}
                role={u.role}
                staffType={u.staffType}
                phone={u.phone}
                icPassport={u.icPassport}
                email={u.email}
                active={u.active}
                bankName={u.bankName}
                bankAccount={u.bankAccount}
              />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-sm text-neutral-500">没有符合的员工 No matching employees</p>
        ) : null}
      </div>
    </div>
  );
}
