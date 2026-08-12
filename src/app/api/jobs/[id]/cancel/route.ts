import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { jobs, users } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("boss", "admin", "supervisor");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (auth.session.user.role === "supervisor") {
    const [assignee] = job.assignedTo
      ? await db.select().from(users).where(eq(users.id, job.assignedTo)).limit(1)
      : [];
    const isOwnTeam =
      job.assignedTo === auth.session.user.id || assignee?.supervisorId === auth.session.user.id;
    if (!isOwnTeam) {
      return NextResponse.json(
        { error: "只能取消自己团队的任务 You can only cancel your own team's jobs" },
        { status: 403 },
      );
    }
  }

  if (job.status === "completed") {
    return NextResponse.json({ error: "已完成的任务不能取消 Completed jobs can't be cancelled" }, { status: 409 });
  }
  if (job.status === "cancelled") {
    return NextResponse.json({ error: "已经是取消状态 Already cancelled" }, { status: 409 });
  }

  const [updated] = await db
    .update(jobs)
    .set({ status: "cancelled" })
    .where(eq(jobs.id, id))
    .returning();

  return NextResponse.json({ job: updated });
}
