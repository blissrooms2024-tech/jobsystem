import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobs, units, users } from "@/db/schema";
import { formatMoney, cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  assigned: "待完成 Assigned",
  completed: "已完成 Completed",
  missed: "错过 Missed",
};

const STATUS_STYLE: Record<string, string> = {
  assigned: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-800",
  missed: "bg-red-100 text-red-800",
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  const isAdmin = ["boss", "admin", "supervisor"].includes(user.role);
  const { status } = await searchParams;

  const conditions = [];
  if (!isAdmin) conditions.push(eq(jobs.assignedTo, user.id));
  if (status) conditions.push(eq(jobs.status, status as "assigned" | "completed" | "missed"));

  const rows = await db
    .select({
      id: jobs.id,
      jobCode: jobs.jobCode,
      title: jobs.title,
      status: jobs.status,
      schedDate: jobs.schedDate,
      pay: jobs.pay,
      unitName: units.unitName,
      assigneeName: users.name,
    })
    .from(jobs)
    .leftJoin(units, eq(jobs.unitId, units.id))
    .leftJoin(users, eq(jobs.assignedTo, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(jobs.schedDate))
    .limit(200);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">任务 Jobs</h1>
        {isAdmin ? (
          <Link
            href="/jobs/new"
            className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
          >
            + 新任务 New job
          </Link>
        ) : null}
      </div>

      <div className="flex gap-2 text-sm">
        {["", "assigned", "completed", "missed"].map((s) => (
          <Link
            key={s || "all"}
            href={s ? `/jobs?status=${s}` : "/jobs"}
            className={cn(
              "rounded-full px-3 py-1",
              (status || "") === s
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-700",
            )}
          >
            {s ? STATUS_LABEL[s] : "全部 All"}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-3 py-2">日期 Date</th>
              <th className="px-3 py-2">标题 Title</th>
              {isAdmin ? <th className="px-3 py-2">负责人 Assignee</th> : null}
              <th className="px-3 py-2">单位 Unit</th>
              <th className="px-3 py-2">状态 Status</th>
              <th className="px-3 py-2">工资 Pay</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="px-3 py-2">
                  <Link href={`/jobs/${row.id}`} className="block">
                    {row.schedDate}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <Link href={`/jobs/${row.id}`} className="block font-medium">
                    {row.title}
                  </Link>
                </td>
                {isAdmin ? <td className="px-3 py-2">{row.assigneeName ?? "-"}</td> : null}
                <td className="px-3 py-2">{row.unitName ?? "-"}</td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      STATUS_STYLE[row.status],
                    )}
                  >
                    {STATUS_LABEL[row.status]}
                  </span>
                </td>
                <td className="px-3 py-2">{formatMoney(row.pay)}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="px-3 py-6 text-center text-neutral-400">
                  暂无任务 No jobs
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
