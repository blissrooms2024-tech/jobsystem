import { db } from "@/db";
import { users } from "@/db/schema";
import { UserRow } from "@/components/user-row";
import { NewUserForm } from "@/components/new-user-form";

export default async function UsersPage() {
  const rows = await db.select().from(users).orderBy(users.userCode);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">员工 Users</h1>

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-3 py-2">姓名 Name</th>
              <th className="px-3 py-2">角色 Role</th>
              <th className="px-3 py-2">类型 Staff type</th>
              <th className="px-3 py-2">银行资料 Bank</th>
              <th className="px-3 py-2">状态 Status</th>
              <th className="px-3 py-2">操作 Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <UserRow
                key={u.id}
                id={u.id}
                name={u.name}
                username={u.username}
                role={u.role}
                staffType={u.staffType}
                active={u.active}
                bankName={u.bankName}
                bankAccount={u.bankAccount}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">新增员工 Add employee</h2>
        <NewUserForm />
      </div>
    </div>
  );
}
