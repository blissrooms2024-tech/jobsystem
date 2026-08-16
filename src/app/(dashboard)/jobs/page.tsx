import Link from "next/link";
import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobs, units, users } from "@/db/schema";
import { cn } from "@/lib/utils";
import { JOB_STATUS_LABEL } from "@/lib/job-status";
import { myToday } from "@/lib/job-timing";
import { JobsListClient } from "@/components/jobs-list-client";
import { JobsDatePicker } from "@/components/jobs-date-picker";
import { Bi } from "@/components/bi";

function addMonths(monthStr: string, delta: number) {
  const [y, m] = monthStr.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; date?: string; month?: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  const isAdmin = ["boss", "admin", "supervisor"].includes(user.role);
  const { status, date, month: monthParam } = await searchParams;

  // A specific-day link (e.g. from the calendar) always wins over the month
  // filter. Otherwise, default to the current month — showing every job
  // ever created was unusably long.
  const showAll = monthParam === "all";
  const month =
    !date && !showAll && monthParam && /^\d{4}-\d{2}$/.test(monthParam)
      ? monthParam
      : myToday().slice(0, 7);

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
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    conditions.push(eq(jobs.schedDate, date));
  } else if (!showAll) {
    const [y, m] = month.split("-").map(Number);
    const monthStart = `${month}-01`;
    const monthEnd = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
    conditions.push(gte(jobs.schedDate, monthStart), lte(jobs.schedDate, monthEnd));
  }

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
      assigneeStaffId: users.staffId,
      assigneeUserCode: users.userCode,
    })
    .from(jobs)
    .leftJoin(units, eq(jobs.unitId, units.id))
    .leftJoin(users, eq(jobs.assignedTo, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(jobs.schedDate), users.staffId, users.userCode)
    .limit(500);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          <Bi zh="任务" en="Jobs" />
          {date ? (
            <span className="ml-2 text-sm font-normal text-neutral-500">
              {date}{" "}
              <Link href="/jobs" className="underline">
                <Bi zh="清除" en="clear" />
              </Link>
            </span>
          ) : null}
        </h1>
        {isAdmin ? (
          <Link
            href="/jobs/new"
            className="rounded-md bg-purple-700 hover:bg-purple-800 px-3 py-2 text-sm font-medium text-white"
          >
            + <Bi zh="新任务" en="New job" />
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        {!date ? (
          <>
            <Link
              href={`/jobs?month=${addMonths(month, -1)}${status ? `&status=${status}` : ""}`}
              className="rounded-md border border-neutral-300 px-2 py-1"
            >
              ‹
            </Link>
            <span className="font-medium">{showAll ? <Bi zh="全部" en="All" /> : month}</span>
            <Link
              href={`/jobs?month=${addMonths(month, 1)}${status ? `&status=${status}` : ""}`}
              className="rounded-md border border-neutral-300 px-2 py-1"
            >
              ›
            </Link>
            {!showAll ? (
              <Link
                href={`/jobs?month=all${status ? `&status=${status}` : ""}`}
                className="ml-1 text-xs text-neutral-500 underline"
              >
                <Bi zh="查看全部" en="Show all time" />
              </Link>
            ) : (
              <Link href="/jobs" className="ml-1 text-xs text-neutral-500 underline">
                <Bi zh="只看本月" en="Back to this month" />
              </Link>
            )}
          </>
        ) : null}
        <JobsDatePicker value={date} />
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {["", "assigned", "in_progress", "completed", "cancelled", "missed"].map((s) => (
          <Link
            key={s || "all"}
            href={s ? `/jobs?status=${s}${showAll ? "&month=all" : `&month=${month}`}` : showAll ? "/jobs?month=all" : `/jobs?month=${month}`}
            className={cn(
              "rounded-full px-3 py-1",
              (status || "") === s
                ? "bg-purple-700 hover:bg-purple-800 text-white"
                : "bg-neutral-100 text-neutral-700",
            )}
          >
            {s ? <Bi zh={JOB_STATUS_LABEL[s].zh} en={JOB_STATUS_LABEL[s].en} /> : <Bi zh="全部" en="All" />}
          </Link>
        ))}
      </div>

      <JobsListClient
        rows={rows}
        isAdmin={isAdmin}
        canDelete={user.role === "boss" || user.role === "admin"}
      />
    </div>
  );
}
