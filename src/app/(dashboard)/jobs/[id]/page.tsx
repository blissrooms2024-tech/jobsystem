import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { Pencil } from "lucide-react";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobs, jobTypes, units, users } from "@/db/schema";
import { formatMoney } from "@/lib/utils";
import { parsePhotos, requiredPhotoCount } from "@/lib/photos";
import { JOB_STATUS_LABEL } from "@/lib/job-status";
import { JobCheckinActions } from "@/components/job-checkin-actions";
import { PhotoUploader } from "@/components/photo-uploader";
import { JobAdminActions } from "@/components/job-admin-actions";
import { Bi } from "@/components/bi";

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
  const isOwnTeam =
    currentUser.role !== "supervisor" || isOwner || assignee?.supervisorId === currentUser.id;
  if ((!isAdmin && !isOwner) || !isOwnTeam) notFound();

  const photos = parsePhotos(job.photos);
  const needCheckin = assignee?.needCheckin ?? true;
  const requiredPhotos = requiredPhotoCount(assignee?.donePhotos);
  const hasCompletionPhoto = photos.some((p) => p.kind === "photo");

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-neutral-400">{job.jobCode}</p>
          <h1 className="text-lg font-semibold">{job.title}</h1>
          {job.description ? (
            <p className="mt-1 text-sm text-neutral-600">{job.description}</p>
          ) : null}
        </div>
        {isAdmin ? (
          <Link
            href={`/jobs/${job.id}/edit`}
            className="flex shrink-0 items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
          >
            <Pencil size={13} /> <Bi zh="编辑" en="Edit" />
          </Link>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Field labelZh="日期" labelEn="Date" value={job.schedDate} />
        <Field
          labelZh="状态"
          labelEn="Status"
          value={
            JOB_STATUS_LABEL[job.status] ? (
              <Bi zh={JOB_STATUS_LABEL[job.status].zh} en={JOB_STATUS_LABEL[job.status].en} />
            ) : (
              job.status
            )
          }
        />
        <Field
          labelZh="负责人"
          labelEn="Assignee"
          value={
            assignee
              ? `${assignee.staffId ?? assignee.userCode} · ${assignee.name}`
              : "-"
          }
        />
        <Field labelZh="工种" labelEn="Job type" value={jobType?.typeName ?? "-"} />
        <Field labelZh="单位" labelEn="Unit" value={unit?.unitName ?? "-"} />
        <Field labelZh="工资" labelEn="Pay" value={formatMoney(job.pay)} />
        {job.notes ? <Field labelZh="备注" labelEn="Notes" value={job.notes} full /> : null}
      </dl>

      {(job.checkInTime || job.checkOutTime) && (
        <div className="rounded-lg border border-neutral-200 p-4 text-sm">
          <p className="mb-2 font-medium">
            <Bi zh="打卡记录" en="Check-in log" />
          </p>
          {job.checkInTime ? (
            <p>
              <Bi zh="上班" en="In" />: {new Date(job.checkInTime).toLocaleString()}
              {job.checkInDist != null ? ` · ${Math.round(job.checkInDist)}m` : ""}
            </p>
          ) : null}
          {job.checkOutTime ? (
            <p>
              <Bi zh="下班" en="Out" />: {new Date(job.checkOutTime).toLocaleString()}
              {job.checkOutDist != null ? ` · ${Math.round(job.checkOutDist)}m` : ""}
            </p>
          ) : null}
        </div>
      )}

      {isOwner ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <Bi
            zh="⚠️ 管理员会检查这个任务是否跟着 SOP 完成——跟着 SOP 才会算已完成并计算工资，没跟着 SOP 不会算完成。"
            en="⚠️ Admin will check whether this job was completed following SOP — only work that follows SOP counts as completed and gets paid; work that doesn't follow SOP will not count as completed."
          />
        </div>
      ) : null}

      {isOwner ? (
        <JobCheckinActions
          jobId={job.id}
          needCheckin={needCheckin}
          status={job.status}
          photoCount={photos.length}
          requiredPhotos={requiredPhotos}
        />
      ) : null}

      {isOwner || isAdmin ? (
        <div className="space-y-3 rounded-lg border border-neutral-200 p-4">
          <p className="text-sm font-medium">
            <Bi zh="照片" en="Photos" />
          </p>
          {isOwner ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {/* No-checkin staff (Posting Agent) only need the single
                  completion photo; before/after comparison shots are a
                  Cleaner (on-site, GPS check-in) concept. */}
              {(needCheckin ? (["before", "after"] as const) : (["photo"] as const)).map((kind) =>
                kind === "photo" && hasCompletionPhoto ? (
                  <p key={kind} className="text-xs text-neutral-500">
                    <Bi
                      zh="完成照片已上传，不能重新上传"
                      en="Completion photo already uploaded — can't be re-uploaded"
                    />
                  </p>
                ) : (
                  <PhotoUploader
                    key={kind}
                    jobId={job.id}
                    kind={kind}
                    context={{ staffName: assignee?.name ?? "", unitName: unit?.unitName, jobTitle: job.title }}
                  />
                ),
              )}
            </div>
          ) : null}
          {photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((p, i) => {
                const proxied = `/api/jobs/${job.id}/photo?url=${encodeURIComponent(p.url)}`;
                return (
                  <a key={i} href={proxied} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element -- served through our own proxy, not worth Image optimization config here */}
                    <img
                      src={proxied}
                      alt={`${p.kind} ${p.idx + 1}`}
                      className="aspect-square w-full rounded-md object-cover"
                    />
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-neutral-400">
              <Bi zh="暂无照片" en="No photos yet" />
            </p>
          )}
        </div>
      ) : null}

      {isAdmin ? (
        <JobAdminActions
          jobId={job.id}
          status={job.status}
          pay={job.pay}
          hasPayroll={!!job.payrollId}
          canDelete={currentUser.role === "boss" || currentUser.role === "admin"}
        />
      ) : null}
    </div>
  );
}

function Field({
  labelZh,
  labelEn,
  value,
  full,
}: {
  labelZh: string;
  labelEn: string;
  value: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : undefined}>
      <dt className="text-xs text-neutral-400">
        <Bi zh={labelZh} en={labelEn} />
      </dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
