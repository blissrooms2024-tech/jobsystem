import Link from "next/link";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobs, users } from "@/db/schema";
import { myToday } from "@/lib/job-timing";
import { cn } from "@/lib/utils";

const DOT_COLOR: Record<string, string> = {
  assigned: "bg-amber-500",
  in_progress: "bg-blue-500",
  completed: "bg-emerald-500",
  cancelled: "bg-neutral-400",
  missed: "bg-red-500",
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function addMonths(monthStr: string, delta: number) {
  const [y, m] = monthStr.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function JobsCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  const isAdmin = ["boss", "admin", "supervisor"].includes(user.role);

  const { month: monthParam } = await searchParams;
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : myToday().slice(0, 7);
  const [year, monthNum] = month.split("-").map(Number);
  const firstOfMonth = new Date(year, monthNum - 1, 1);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const startWeekday = firstOfMonth.getDay();
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(daysInMonth).padStart(2, "0")}`;

  const conditions = [gte(jobs.schedDate, monthStart), lte(jobs.schedDate, monthEnd)];
  if (!isAdmin) {
    conditions.push(eq(jobs.assignedTo, user.id));
  } else if (user.role === "supervisor") {
    const subordinates = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.supervisorId, user.id));
    conditions.push(inArray(jobs.assignedTo, [user.id, ...subordinates.map((s) => s.id)]));
  }

  const rows = await db
    .select({ schedDate: jobs.schedDate, status: jobs.status })
    .from(jobs)
    .where(and(...conditions));

  const byDay = new Map<string, string[]>();
  for (const r of rows) {
    const list = byDay.get(r.schedDate) ?? [];
    list.push(r.status);
    byDay.set(r.schedDate, list);
  }

  const today = myToday();
  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">日历 Calendar</h1>
        <div className="flex items-center gap-2 text-sm">
          <Link href={`/jobs/calendar?month=${addMonths(month, -1)}`} className="rounded-md border border-neutral-300 px-2 py-1">
            ‹
          </Link>
          <span className="font-medium">{month}</span>
          <Link href={`/jobs/calendar?month=${addMonths(month, 1)}`} className="rounded-md border border-neutral-300 px-2 py-1">
            ›
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 p-3">
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-neutral-500">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;
            const dateStr = `${month}-${String(day).padStart(2, "0")}`;
            const statuses = byDay.get(dateStr) ?? [];
            return (
              <Link
                href={`/jobs?date=${dateStr}`}
                key={dateStr}
                className={cn(
                  "flex aspect-square flex-col items-center justify-start rounded-md border border-neutral-100 p-1 text-xs hover:bg-neutral-50",
                  dateStr === today && "border-purple-700",
                )}
              >
                <span>{day}</span>
                <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                  {statuses.slice(0, 6).map((s, idx) => (
                    <span key={idx} className={cn("h-1.5 w-1.5 rounded-full", DOT_COLOR[s] ?? "bg-neutral-300")} />
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          🟠 待完成 · 🔵 打卡中 · 🟢 已完成 · ⚪ 已取消 · 🔴 错过 — 点日期查看当天任务
        </p>
      </div>
    </div>
  );
}
