import { and, eq, gte, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobs, leaves, payroll } from "@/db/schema";
import { formatMoney } from "@/lib/utils";

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
    })
    .from(payroll);

  const [leaveStats] = await db
    .select({ pending: sql<number>`count(*)` })
    .from(leaves)
    .where(eq(leaves.status, "pending"));

  return { ...jobStats, ...payrollStats, pendingLeaves: leaveStats?.pending ?? 0 };
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default async function DashboardHomePage() {
  const session = await auth();
  const user = session!.user;
  const isAdmin = user.role === "boss" || user.role === "admin" || user.role === "supervisor";

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">
        欢迎, {user.name} Welcome
      </h1>

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
      <StatCard label="今日任务 Today's jobs" value={stats.todayJobs} />
      <StatCard label="待处理任务 Open jobs" value={stats.openJobs} />
      <StatCard label="打卡中 In progress" value={stats.inProgressJobs} />
      <StatCard label="错过任务 Missed jobs" value={stats.missedJobs} />
      <StatCard label="待发放工资单 Draft payroll" value={stats.draftCount} />
      <StatCard label="草稿总额 Draft total" value={formatMoney(stats.draftTotal)} />
      <StatCard label="待批请假 Pending leaves" value={stats.pendingLeaves} />
    </div>
  );
}

async function EmployeeOverview({ userId }: { userId: string }) {
  const stats = await getEmployeeStats(userId);
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <StatCard label="本月已完成 Completed (month)" value={stats.completed ?? 0} />
      <StatCard label="待完成 Assigned" value={stats.assigned ?? 0} />
      <StatCard label="错过 Missed" value={stats.missed ?? 0} />
      <StatCard label="待批请假 Pending leave" value={stats.pendingLeave} />
    </div>
  );
}
