import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { jobs, units, users } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";
import { generateJobCode } from "@/lib/codes";
import { datesBetween } from "@/lib/job-timing";
import { notifyJobAssigned } from "@/lib/reminders";

const bodySchema = z.object({
  schedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "请选择日期 Please pick a date"),
  untilDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

const MAX_REPEAT_DAYS = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("boss", "admin", "supervisor");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const [source] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (auth.session.user.role === "supervisor") {
    const [assignee] = source.assignedTo
      ? await db.select().from(users).where(eq(users.id, source.assignedTo)).limit(1)
      : [];
    const isOwnTeam =
      source.assignedTo === auth.session.user.id || assignee?.supervisorId === auth.session.user.id;
    if (!isOwnTeam) {
      return NextResponse.json(
        { error: "只能重复自己团队的任务 You can only duplicate your own team's jobs" },
        { status: 403 },
      );
    }
  }

  const dates = parsed.data.untilDate
    ? datesBetween(parsed.data.schedDate, parsed.data.untilDate)
    : [parsed.data.schedDate];
  if (parsed.data.untilDate && parsed.data.untilDate < parsed.data.schedDate) {
    return NextResponse.json(
      { error: "结束日期不能早于开始日期 End date must be after start date" },
      { status: 400 },
    );
  }
  if (dates.length > MAX_REPEAT_DAYS) {
    return NextResponse.json(
      { error: `一次最多重复 ${MAX_REPEAT_DAYS} 天 Can only repeat up to ${MAX_REPEAT_DAYS} days at once` },
      { status: 400 },
    );
  }

  const created = await db
    .insert(jobs)
    .values(
      dates.map((schedDate) => ({
        jobCode: generateJobCode(new Date(schedDate)),
        title: source.title,
        description: source.description,
        property: source.property,
        unitId: source.unitId,
        assignedTo: source.assignedTo,
        assignedBy: auth.session.user.id,
        schedDate,
        startTime: source.startTime,
        endTime: source.endTime,
        jobTypeId: source.jobTypeId,
        notes: source.notes,
        pay: source.pay,
      })),
    )
    .returning();

  if (source.assignedTo) {
    try {
      const [unit] = source.unitId ? await db.select().from(units).where(eq(units.id, source.unitId)).limit(1) : [];
      await notifyJobAssigned({
        jobId: created[0].id,
        assigneeId: source.assignedTo,
        title: source.title,
        dates,
        unitName: unit?.unitName,
        startTime: source.startTime,
      });
    } catch (err) {
      console.error("Failed to send job-assigned notification", err);
    }
  }

  return NextResponse.json({ job: created[0], jobs: created, count: created.length }, { status: 201 });
}
