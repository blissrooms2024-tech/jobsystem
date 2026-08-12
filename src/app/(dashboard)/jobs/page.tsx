import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobs, units, users } from "@/db/schema";
import { formatMoney, cn } from "@/lib/utils";
import { JOB_STATUS_LABEL, JOB_STATUS_STYLE } from "@/lib/job-status";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; date?: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  const isAdmin = ["boss", "admin", "supervisor"].includes(user.role);
  const { status, date } = await searchParams;

  const conditions = [];
  if (!isAdmin) {
    conditions.push(eq(jobs.assignedTo, user.id));
  } else if (user.role === "supervisor") {
    const subordinates = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.supervisorId, user.id));
    conditions.push(inArray(jobs.assignedTo, [user.id, ...subordinates.map((s) => s.id)]));
  }
  if (status)
    conditions.push(
      eq(jobs.status, status as "assigned" | "in_progress" | "completed" | "cancelled" | "missed"),
    );
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) conditions.push(eq(jobs.schedDate, date));

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
        <h1 className="text-lg font-semibold">
          任务 Jobs
          {date ? (
            <span className="ml-2 text-sm font-normal text-neutral-500">
              {date} <Link href="/jobs" className="underline">清除 clear</Link>
            </span>
          ) : null}
        </h1>
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
        {["", "assigned", "in_progress", "completed", "cancelled", "missed"].map((s) => (
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
            {s ? JOB_STATUS_LABEL[s] : "全部 All"}
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
                      JOB_STATUS_STYLE[row.status],
                    )}
                  >
                    {JOB_STATUS_LABEL[row.status]}
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
