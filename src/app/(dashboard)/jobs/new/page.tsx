import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobTypes, units, users } from "@/db/schema";
import { NewJobForm } from "@/components/new-job-form";
import { myToday, maxSchedulableDate } from "@/lib/job-timing";

export default async function NewJobPage() {
  const session = await auth();
  if (!["boss", "admin", "supervisor"].includes(session!.user.role)) notFound();

  const [unitRows, jobTypeRows, employeeRows] = await Promise.all([
    db.select().from(units),
    db.select().from(jobTypes).where(eq(jobTypes.active, true)),
    db.select().from(users).where(eq(users.active, true)),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">新任务 New job</h1>
      <NewJobForm
        units={unitRows.map((u) => ({ id: u.id, label: u.unitName }))}
        jobTypes={jobTypeRows.map((jt) => ({ id: jt.id, label: jt.typeName, pay: jt.pay }))}
        employees={employeeRows
          .filter((u) => {
            if (session!.user.role === "supervisor") {
              return u.id === session!.user.id || u.supervisorId === session!.user.id;
            }
            return u.role === "employee" || u.role === "supervisor";
          })
          .map((u) => ({ id: u.id, label: u.name }))}
        minDate={myToday()}
        maxDate={maxSchedulableDate()}
      />
    </div>
  );
}
