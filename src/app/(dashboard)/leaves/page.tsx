import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { leaves, users } from "@/db/schema";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-neutral-200 text-neutral-600",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "待审批 Pending",
  approved: "已批准 Approved",
  rejected: "已拒绝 Rejected",
  cancelled: "已取消 Cancelled",
};

export default async function LeavesPage() {
  const session = await auth();
  const user = session!.user;
  const isAdmin = ["boss", "admin", "supervisor"].includes(user.role);

  let scope;
  if (!isAdmin) {
    scope = eq(leaves.userId, user.id);
  } else if (user.role === "supervisor") {
    const subordinates = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.supervisorId, user.id));
    scope = inArray(
      leaves.userId,
      subordinates.map((s) => s.id),
    );
  }

  const rows = await db
    .select({
      id: leaves.id,
      leaveCode: leaves.leaveCode,
      type: leaves.type,
      startDate: leaves.startDate,
      endDate: leaves.endDate,
      days: leaves.days,
      status: leaves.status,
      employeeName: users.name,
    })
    .from(leaves)
    .innerJoin(users, eq(leaves.userId, users.id))
    .where(scope)
    .orderBy(desc(leaves.createdAt))
    .limit(200);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">请假 Leaves</h1>
        <Link
          href="/leaves/new"
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
        >
          + 申请请假 Request leave
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              {isAdmin ? <th className="px-3 py-2">员工 Employee</th> : null}
              <th className="px-3 py-2">类型 Type</th>
              <th className="px-3 py-2">日期 Dates</th>
              <th className="px-3 py-2">天数 Days</th>
              <th className="px-3 py-2">状态 Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                {isAdmin ? (
                  <td className="px-3 py-2">
                    <Link href={`/leaves/${r.id}`}>{r.employeeName}</Link>
                  </td>
                ) : null}
                <td className="px-3 py-2">
                  <Link href={`/leaves/${r.id}`} className="block">
                    {r.type}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  {r.startDate} ~ {r.endDate}
                </td>
                <td className="px-3 py-2">{r.days}</td>
                <td className="px-3 py-2">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLE[r.status])}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="px-3 py-6 text-center text-neutral-400">
                  暂无请假记录 No leave requests
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
