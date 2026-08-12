import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { leaves, users } from "@/db/schema";
import { LeaveReviewActions } from "@/components/leave-review-actions";
import { CancelMyLeaveButton } from "@/components/cancel-my-leave-button";

export default async function LeaveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const currentUser = session!.user;

  const [row] = await db
    .select({ leave: leaves, employee: users })
    .from(leaves)
    .innerJoin(users, eq(leaves.userId, users.id))
    .where(eq(leaves.id, id))
    .limit(1);

  if (!row) notFound();

  const isAdmin = ["boss", "admin", "supervisor"].includes(currentUser.role);
  const isOwner = row.leave.userId === currentUser.id;
  const isOwnTeam =
    currentUser.role !== "supervisor" || isOwner || row.employee.supervisorId === currentUser.id;
  if ((!isAdmin && !isOwner) || !isOwnTeam) notFound();

  const l = row.leave;
  const canReview = isAdmin && !isOwner && (l.status === "pending" || l.status === "approved");
  const canCancelOwn = isOwner && (l.status === "pending" || l.status === "approved");

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <p className="text-xs text-neutral-400">{l.leaveCode}</p>
        <h1 className="text-lg font-semibold">{row.employee.name} · {l.type}</h1>
        <p className="text-sm text-neutral-500">
          {l.startDate} ~ {l.endDate} ({l.days} 天 days)
        </p>
      </div>

      {l.reason ? (
        <div>
          <p className="text-xs text-neutral-400">原因 Reason</p>
          <p className="text-sm">{l.reason}</p>
        </div>
      ) : null}

      <div>
        <p className="text-xs text-neutral-400">状态 Status</p>
        <p className="text-sm font-medium capitalize">{l.status}</p>
        {l.reviewNote ? <p className="mt-1 text-sm text-neutral-600">备注: {l.reviewNote}</p> : null}
      </div>

      {canReview ? <LeaveReviewActions leaveId={l.id} status={l.status} /> : null}
      {canCancelOwn ? <CancelMyLeaveButton leaveId={l.id} /> : null}
    </div>
  );
}
