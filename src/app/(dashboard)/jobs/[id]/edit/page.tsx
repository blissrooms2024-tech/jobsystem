import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobTypes, jobs, units, users } from "@/db/schema";
import { EditJobForm } from "@/components/edit-job-form";
import { maxSchedulableDate } from "@/lib/job-timing";
import { Bi } from "@/components/bi";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const currentUser = session!.user;
  if (!["boss", "admin", "supervisor"].includes(currentUser.role)) notFound();

  const [row] = await db
    .select({ job: jobs, assignee: users })
    .from(jobs)
    .leftJoin(users, eq(jobs.assignedTo, users.id))
    .where(eq(jobs.id, id))
    .limit(1);
  if (!row) notFound();

  const isOwnTeam =
    currentUser.role !== "supervisor" ||
    row.job.assignedTo === currentUser.id ||
    row.assignee?.supervisorId === currentUser.id;
  if (!isOwnTeam) notFound();

  const [unitRows, jobTypeRows, employeeRows] = await Promise.all([
    db.select().from(units),
    db.select().from(jobTypes).where(eq(jobTypes.active, true)),
    db.select().from(users).where(eq(users.active, true)).orderBy(users.staffId, users.userCode),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">
        <Bi zh="编辑任务" en="Edit job" />
      </h1>
      <EditJobForm
        jobId={id}
        units={unitRows.map((u) => ({ id: u.id, label: u.unitName }))}
        jobTypes={jobTypeRows.map((jt) => ({ id: jt.id, label: jt.typeName, pay: jt.pay }))}
        employees={employeeRows
          .filter((u) => {
            if (currentUser.role === "supervisor") {
              return u.id === currentUser.id || u.supervisorId === currentUser.id;
            }
            return u.role === "employee" || u.role === "supervisor";
          })
          .map((u) => ({ id: u.id, label: `${u.staffId ?? u.userCode} · ${u.name}` }))}
        maxDate={maxSchedulableDate()}
        initial={{
          title: row.job.title,
          description: row.job.description,
          unitId: row.job.unitId,
          assignedTo: row.job.assignedTo,
          schedDate: row.job.schedDate,
          startTime: row.job.startTime,
          endTime: row.job.endTime,
          jobTypeId: row.job.jobTypeId,
          notes: row.job.notes,
          pay: row.job.pay,
        }}
      />
    </div>
  );
}
