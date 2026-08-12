import { and, eq, gte, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobs, leaves, payroll } from "@/db/schema";
import { formatMoney } from "@/lib/utils";
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

export default async function DashboardHomePage() {
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
