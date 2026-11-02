import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { jobTypes, jobs, payroll, units, users } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";
import { assertSchedulableDate } from "@/lib/job-timing";
import { normalizeProject } from "@/lib/job-projects";
import { cleanPostLinks, parsePostLinks, serializePostLinks } from "@/lib/post-links";

const STAFF_ROLES = new Set(["boss", "admin", "supervisor"]);
// What the assigned agent may change on their own job.
const AGENT_EDITABLE = new Set(["project", "postLinks"]);

const bodySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  project: z.string().nullable().optional(),
  unitId: z.string().uuid().nullable().optional(),
  assignedTo: z.string().uuid().optional(),
  schedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  jobTypeId: z.string().uuid().nullable().optional(),
  notes: z.string().optional(),
  pay: z.coerce.number().nonnegative().optional(),
  // Legacy single field (also accepts several links, one per line).
  postLink: z.string().nullable().optional(),
  postLinks: z.array(z.string().max(2000)).max(20).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole();
  if ("error" in auth) return auth.error;
  const isStaff = STAFF_ROLES.has(auth.session.user.role);

  const { id } = await params;
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (job.payrollId) {
    const [linkedPayroll] = await db.select().from(payroll).where(eq(payroll.id, job.payrollId)).limit(1);
    if (linkedPayroll?.status === "paid") {
      return NextResponse.json(
        { error: "此任务已计入已发放的工资单，不能修改，请先撤销发放 Already paid out — unpay it first before editing" },
        { status: 409 },
      );
    }
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;

  // Posting agents can fill in the project and their post links on their own
  // job (links often arrive days later, after Mudah/iBilik approve the post),
  // but nothing else.
  if (!isStaff) {
    if (job.assignedTo !== auth.session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const extra = Object.keys(data).filter((k) => !AGENT_EDITABLE.has(k));
    if (extra.length > 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let postLink: string | null | undefined = undefined;
  if (data.postLinks !== undefined || data.postLink !== undefined) {
    const raw = data.postLinks ?? parsePostLinks(data.postLink);
    const { links, invalid } = cleanPostLinks(raw);
    if (invalid) {
      return NextResponse.json(
        { error: `链接格式不正确 Invalid link: ${invalid}` },
        { status: 400 },
      );
    }
    postLink = serializePostLinks(links);
  }

  if (auth.session.user.role === "supervisor") {
    const currentAssignee = job.assignedTo
      ? await db.select().from(users).where(eq(users.id, job.assignedTo)).limit(1)
      : [];
    const isOwnTeam =
      job.assignedTo === auth.session.user.id ||
      currentAssignee[0]?.supervisorId === auth.session.user.id;
    if (!isOwnTeam) {
      return NextResponse.json(
        { error: "只能编辑自己团队的任务 You can only edit your own team's jobs" },
        { status: 403 },
      );
    }
    if (data.assignedTo) {
      const [newAssignee] = await db.select().from(users).where(eq(users.id, data.assignedTo)).limit(1);
      const isSelf = data.assignedTo === auth.session.user.id;
      const isOwnSubordinate = newAssignee?.supervisorId === auth.session.user.id;
      if (!isSelf && !isOwnSubordinate) {
        return NextResponse.json(
          { error: "只能分配给自己团队的员工 You can only assign jobs to your own team" },
          { status: 403 },
        );
      }
    }
  }

  if (data.schedDate) {
    try {
      assertSchedulableDate(data.schedDate);
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid date" }, { status: 400 });
    }
  }

  let pay = data.pay?.toFixed(2);
  let property: string | null | undefined = undefined;
  if (data.jobTypeId !== undefined && pay === undefined) {
    if (data.jobTypeId) {
      const [jt] = await db.select().from(jobTypes).where(eq(jobTypes.id, data.jobTypeId)).limit(1);
      if (jt) pay = jt.pay;
    } else {
      pay = "0";
    }
  }
  if (data.unitId !== undefined) {
    if (data.unitId) {
      const [unit] = await db.select().from(units).where(eq(units.id, data.unitId)).limit(1);
      property = unit?.property ?? null;
    } else {
      property = null;
    }
  }

  const [updated] = await db
    .update(jobs)
    .set({
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description || null } : {}),
      ...(data.project !== undefined ? { project: normalizeProject(data.project) } : {}),
      ...(data.unitId !== undefined ? { unitId: data.unitId, property } : {}),
      ...(data.assignedTo !== undefined ? { assignedTo: data.assignedTo } : {}),
      ...(data.schedDate !== undefined ? { schedDate: data.schedDate } : {}),
      ...(data.startTime !== undefined ? { startTime: data.startTime || null } : {}),
      ...(data.endTime !== undefined ? { endTime: data.endTime || null } : {}),
      ...(data.jobTypeId !== undefined ? { jobTypeId: data.jobTypeId } : {}),
      ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      ...(postLink !== undefined ? { postLink } : {}),
      ...(pay !== undefined ? { pay } : {}),
    })
    .where(eq(jobs.id, id))
    .returning();

  return NextResponse.json({ job: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("boss", "admin");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (job.payrollId) {
    const [linkedPayroll] = await db
      .select()
      .from(payroll)
      .where(eq(payroll.id, job.payrollId))
      .limit(1);
    if (linkedPayroll?.status === "paid") {
      return NextResponse.json(
        { error: "此任务已计入已发放的工资单，不能删除 Already paid out, cannot delete" },
        { status: 409 },
      );
    }
    if (linkedPayroll) {
      // Keep the still-draft payslip's totals honest — pull this job's pay
      // back out before the row disappears.
      await db
        .update(payroll)
        .set({
          jobsCount: sql`${payroll.jobsCount} - 1`,
          jobsPay: sql`${payroll.jobsPay} - ${job.pay}`,
        })
        .where(eq(payroll.id, linkedPayroll.id));
    }
  }

  await db.delete(jobs).where(eq(jobs.id, id));
  return NextResponse.json({ ok: true });
}
