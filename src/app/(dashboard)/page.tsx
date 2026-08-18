import { and, eq, gte, lte, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobs, leaves, payroll, users } from "@/db/schema";
import { formatMoney } from "@/lib/utils";
import { myToday } from "@/lib/job-timing";
import { Bi } from "@/components/bi";

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

async function getEmployeeStats(userId: string) {
  const monthStart = startOfMonth();
  const [row] = await db
    .select({
      completed: sql<number>`count(*) filter (where ${jobs.status} = 'completed')`,
      assigned: sql<number>`count(*) filter (where ${jobs.status} = 'assigned')`,
      missed: sql<number>`count(*) filter (where ${jobs.status} = 'missed')`,
    })
    .from(jobs)
    .where(
      and(eq(jobs.assignedTo, userId), gte(jobs.schedDate, monthStart.toISOString().slice(0, 10))),
    );

  const [pendingLeave] = await db
    .select({ count: sql<number>`count(*)` })
    .from(leaves)
    .where(and(eq(leaves.userId, userId), eq(leaves.status, "pending")));

  return { ...row, pendingLeave: pendingLeave?.count ?? 0 };
}

async function getAdminStats() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = startOfMonth().toISOString();
  const [jobStats] = await db
    .select({
      todayJobs: sql<number>`count(*) filter (where ${jobs.schedDate} = ${today})`,
      openJobs: sql<number>`count(*) filter (where ${jobs.status} = 'assigned')`,
      inProgressJobs: sql<number>`count(*) filter (where ${jobs.status} = 'in_progress')`,
      missedJobs: sql<number>`count(*) filter (where ${jobs.status} = 'missed')`,
    })
    .from(jobs);

  const [payrollStats] = await db
    .select({
      draftCount: sql<number>`count(*) filter (where ${payroll.status} = 'draft')`,
      draftTotal: sql<string>`coalesce(sum(${payroll.jobsPay} + ${payroll.baseSalary} + ${payroll.allowance} - ${payroll.deduction}) filter (where ${payroll.status} = 'draft'), 0)`,
      paidThisMonthTotal: sql<string>`coalesce(sum(${payroll.jobsPay} + ${payroll.baseSalary} + ${payroll.allowance} - ${payroll.deduction}) filter (where ${payroll.status} = 'paid' and ${payroll.paidAt} >= ${monthStart}), 0)`,
    })
    .from(payroll);

  const [leaveStats] = await db
    .select({ pending: sql<number>`count(*)` })
    .from(leaves)
    .where(eq(leaves.status, "pending"));

  return { ...jobStats, ...payrollStats, pendingLeaves: leaveStats?.pending ?? 0 };
}

/** Ad-hoc "how much did X do/earn in period Y" lookup — a specific date wins
 * over the month if both are somehow present, mirroring the Jobs page filter. */
async function getScopedStats(opts: { userId?: string; date?: string; month: string }) {
  let periodStart: string;
  let periodEnd: string;
  if (opts.date) {
    periodStart = opts.date;
    periodEnd = opts.date;
  } else {
    const [y, m] = opts.month.split("-").map(Number);
    periodStart = `${opts.month}-01`;
    periodEnd = `${opts.month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
  }

  const jobConditions = [gte(jobs.schedDate, periodStart), lte(jobs.schedDate, periodEnd)];
  if (opts.userId) jobConditions.push(eq(jobs.assignedTo, opts.userId));

  const [jobStats] = await db
    .select({
      completed: sql<number>`count(*) filter (where ${jobs.status} = 'completed')`,
      missed: sql<number>`count(*) filter (where ${jobs.status} = 'missed')`,
      completedPay: sql<string>`coalesce(sum(${jobs.pay}) filter (where ${jobs.status} = 'completed'), 0)`,
    })
    .from(jobs)
    .where(and(...jobConditions));

  // "Paid" here means payroll actually marked Paid with a paidAt landing in
  // this window — separate from completedPay, which is job-level earnings
  // regardless of whether a payslip has been generated/paid yet.
  const paidConditions = [
    eq(payroll.status, "paid"),
    gte(payroll.paidAt, new Date(`${periodStart}T00:00:00+08:00`)),
    lte(payroll.paidAt, new Date(`${periodEnd}T23:59:59+08:00`)),
  ];
  if (opts.userId) paidConditions.push(eq(payroll.userId, opts.userId));

  const [paidStats] = await db
    .select({
      paidTotal: sql<string>`coalesce(sum(${payroll.jobsPay} + ${payroll.baseSalary} + ${payroll.allowance} - ${payroll.deduction}), 0)`,
    })
    .from(payroll)
    .where(and(...paidConditions));

  return { ...jobStats, paidTotal: paidStats?.paidTotal ?? "0" };
}

function StatCard({
  labelZh,
  labelEn,
  value,
  accent,
}: {
  labelZh: string;
  labelEn: string;
  value: string | number;
  accent?: "amber" | "red" | "emerald";
}) {
  const ACCENT: Record<string, string> = {
    amber: "bg-amber-400",
    red: "bg-red-400",
    emerald: "bg-emerald-400",
  };
  return (
    <div className="group relative overflow-hidden rounded-xl border border-neutral-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className={`absolute inset-x-0 top-0 h-1 ${accent ? ACCENT[accent] : "bg-purple-400"}`} />
      <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase">
        <Bi zh={labelZh} en={labelEn} />
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">{value}</p>
    </div>
  );
}

export default async function DashboardHomePage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; date?: string; month?: string }>;
}) {
  const session = await auth();
  const user = session!.user;
  const isAdmin = user.role === "boss" || user.role === "admin" || user.role === "supervisor";
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          <Bi zh="欢迎" en="Welcome" />, {user.name}
        </h1>
        <p className="mt-1 text-sm text-neutral-400">{today}</p>
      </div>

      {isAdmin ? (
        <AdminOverview />
      ) : (
        <EmployeeOverview userId={user.id} />
      )}

      {isAdmin ? <ScopedStatsPanel searchParams={await searchParams} /> : null}
    </div>
  );
}

async function AdminOverview() {
  const stats = await getAdminStats();
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <StatCard labelZh="今日任务" labelEn="Today's jobs" value={stats.todayJobs} />
      <StatCard labelZh="待处理任务" labelEn="Open jobs" value={stats.openJobs} />
      <StatCard labelZh="打卡中" labelEn="In progress" value={stats.inProgressJobs} />
      <StatCard labelZh="错过任务" labelEn="Missed jobs" value={stats.missedJobs} accent="red" />
      <StatCard labelZh="待发放工资单" labelEn="Draft payroll" value={stats.draftCount} accent="amber" />
      <StatCard labelZh="草稿总额" labelEn="Draft total" value={formatMoney(stats.draftTotal)} accent="amber" />
      <StatCard labelZh="本月已发放" labelEn="Paid this month" value={formatMoney(stats.paidThisMonthTotal)} accent="emerald" />
      <StatCard labelZh="待批请假" labelEn="Pending leaves" value={stats.pendingLeaves} accent="amber" />
    </div>
  );
}

async function EmployeeOverview({ userId }: { userId: string }) {
  const stats = await getEmployeeStats(userId);
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard labelZh="本月已完成" labelEn="Completed (month)" value={stats.completed ?? 0} accent="emerald" />
      <StatCard labelZh="待完成" labelEn="Assigned" value={stats.assigned ?? 0} />
      <StatCard labelZh="错过" labelEn="Missed" value={stats.missed ?? 0} accent="red" />
      <StatCard labelZh="待批请假" labelEn="Pending leave" value={stats.pendingLeave} accent="amber" />
    </div>
  );
}

async function ScopedStatsPanel({
  searchParams,
}: {
  searchParams: { userId?: string; date?: string; month?: string };
}) {
  const employees = await db
    .select({ id: users.id, name: users.name, staffId: users.staffId, userCode: users.userCode })
    .from(users)
    .where(eq(users.active, true))
    .orderBy(users.staffId, users.userCode);

  const month = !searchParams.date && searchParams.month ? searchParams.month : myToday().slice(0, 7);
  const stats = await getScopedStats({ userId: searchParams.userId, date: searchParams.date, month });

  return (
    <div className="space-y-4 border-t border-neutral-200 pt-6">
      <h2 className="text-sm font-semibold text-neutral-700">
        <Bi zh="按员工/日期查询" en="Employee & date lookup" />
      </h2>

      <form className="flex flex-wrap items-end gap-3 text-sm" method="get">
        <label className="space-y-1">
          <span className="block text-xs text-neutral-500">
            <Bi zh="员工" en="Employee" />
          </span>
          <select
            name="userId"
            defaultValue={searchParams.userId ?? ""}
            className="rounded-md border border-neutral-300 px-2 py-1.5"
          >
            <option value="">
              <Bi zh="全部员工" en="All employees" />
            </option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {(e.staffId ?? e.userCode) + " · " + e.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-neutral-500">
            <Bi zh="月份" en="Month" />
          </span>
          <input
            type="month"
            name="month"
            defaultValue={month}
            className="rounded-md border border-neutral-300 px-2 py-1.5"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-neutral-500">
            <Bi zh="或指定日期" en="Or a specific date" />
          </span>
          <input
            type="date"
            name="date"
            defaultValue={searchParams.date ?? ""}
            className="rounded-md border border-neutral-300 px-2 py-1.5"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-purple-700 hover:bg-purple-800 px-4 py-1.5 font-medium text-white"
        >
          <Bi zh="查询" en="Search" />
        </button>
      </form>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard labelZh="已完成任务" labelEn="Completed jobs" value={stats.completed ?? 0} accent="emerald" />
        <StatCard labelZh="错过任务" labelEn="Missed jobs" value={stats.missed ?? 0} accent="red" />
        <StatCard labelZh="任务工资总额" labelEn="Job pay total" value={formatMoney(stats.completedPay)} />
        <StatCard labelZh="已发放工资" labelEn="Paid out" value={formatMoney(stats.paidTotal)} accent="emerald" />
      </div>
    </div>
  );
}
