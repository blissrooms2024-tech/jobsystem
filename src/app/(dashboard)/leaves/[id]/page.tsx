import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { leaves, users } from "@/db/schema";
import { LeaveReviewActions } from "@/components/leave-review-actions";

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
  if (!isAdmin && !isOwner) notFound();

  const l = row.leave;

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

      {isAdmin && l.status === "pending" ? <LeaveReviewActions leaveId={l.id} /> : null}
    </div>
  );
}
