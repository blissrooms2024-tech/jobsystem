import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobs, jobTypes, units, users } from "@/db/schema";
import { formatMoney } from "@/lib/utils";
import { parsePhotos, PHOTO_KINDS } from "@/lib/photos";
import { JobCheckinActions } from "@/components/job-checkin-actions";
import { PhotoUploader } from "@/components/photo-uploader";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const currentUser = session!.user;

  const [row] = await db
    .select({
      job: jobs,
      unit: units,
      assignee: users,
      jobType: jobTypes,
    })
    .from(jobs)
    .leftJoin(units, eq(jobs.unitId, units.id))
    .leftJoin(users, eq(jobs.assignedTo, users.id))
    .leftJoin(jobTypes, eq(jobs.jobTypeId, jobTypes.id))
    .where(eq(jobs.id, id))
    .limit(1);

  if (!row) notFound();

  const { job, unit, assignee, jobType } = row;
  const isAdmin = ["boss", "admin", "supervisor"].includes(currentUser.role);
  const isOwner = job.assignedTo === currentUser.id;
  if (!isAdmin && !isOwner) notFound();

  const photos = parsePhotos(job.photos);
  const needCheckin = assignee?.needCheckin ?? true;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-xs text-neutral-400">{job.jobCode}</p>
        <h1 className="text-lg font-semibold">{job.title}</h1>
        {job.description ? (
          <p className="mt-1 text-sm text-neutral-600">{job.description}</p>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Field label="日期 Date" value={job.schedDate} />
        <Field label="状态 Status" value={job.status} />
        <Field label="负责人 Assignee" value={assignee?.name ?? "-"} />
        <Field label="工种 Job type" value={jobType?.typeName ?? "-"} />
        <Field label="单位 Unit" value={unit?.unitName ?? "-"} />
        <Field label="工资 Pay" value={formatMoney(job.pay)} />
        {job.notes ? <Field label="备注 Notes" value={job.notes} full /> : null}
      </dl>

      {(job.checkInTime || job.checkOutTime) && (
        <div className="rounded-lg border border-neutral-200 p-4 text-sm">
          <p className="mb-2 font-medium">打卡记录 Check-in log</p>
          {job.checkInTime ? (
            <p>
              上班 In: {new Date(job.checkInTime).toLocaleString()}
              {job.checkInDist != null ? ` · ${Math.round(job.checkInDist)}m` : ""}
            </p>
          ) : null}
          {job.checkOutTime ? (
            <p>
              下班 Out: {new Date(job.checkOutTime).toLocaleString()}
              {job.checkOutDist != null ? ` · ${Math.round(job.checkOutDist)}m` : ""}
            </p>
          ) : null}
        </div>
      )}

      {isOwner ? (
        <JobCheckinActions
          jobId={job.id}
          needCheckin={needCheckin}
          hasCheckedIn={!!job.checkInTime}
          hasCheckedOut={!!job.checkOutTime}
          isCompleted={job.status === "completed"}
        />
      ) : null}

      {isOwner || isAdmin ? (
        <div className="space-y-3 rounded-lg border border-neutral-200 p-4">
          <p className="text-sm font-medium">照片 Photos</p>
          {isOwner ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {PHOTO_KINDS.map((kind) => (
                <PhotoUploader key={kind} jobId={job.id} kind={kind} />
              ))}
            </div>
          ) : null}
          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((p, i) => (
                <a key={i} href={p.url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element -- remote Blob URLs, not worth Image optimization config here */}
                  <img
                    src={p.url}
                    alt={`${p.kind} ${p.idx + 1}`}
                    className="aspect-square w-full rounded-md object-cover"
                  />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-400">暂无照片 No photos yet</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : undefined}>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
