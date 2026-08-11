import { db } from "@/db";
import { jobTypes } from "@/db/schema";
import { JobTypeRow } from "@/components/job-type-row";
import { NewJobTypeForm } from "@/components/new-job-type-form";

export default async function JobTypesPage() {
  const rows = await db.select().from(jobTypes);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">工种 Job Types</h1>

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full max-w-lg text-left text-sm">
          <thead className="bg-neutral-50 text-neutral-500">
            <tr>
              <th className="px-3 py-2">名称 Name</th>
              <th className="px-3 py-2">单价 Pay</th>
              <th className="px-3 py-2">状态 Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((jt) => (
              <JobTypeRow key={jt.id} id={jt.id} typeName={jt.typeName} pay={jt.pay} active={jt.active} />
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold">新增工种 Add job type</h2>
        <NewJobTypeForm />
      </div>
    </div>
  );
}
