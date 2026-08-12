import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { jobTypes, jobs, units, users } from "@/db/schema";
import { generateJobCode } from "@/lib/codes";
import { requireRole } from "@/lib/api-auth";
import { assertSchedulableDate, datesBetween } from "@/lib/job-timing";
import { eq } from "drizzle-orm";

const bodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  unitId: z.string().uuid().optional(),
  assignedTo: z.string().uuid(),
  schedDate: z.string(), // yyyy-mm-dd
  repeatUntil: z.string().optional(), // yyyy-mm-dd — creates one job per day through this date
  startTime: z.string().optional(), // HH:mm
  endTime: z.string().optional(),
  jobTypeId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

const MAX_REPEAT_DAYS = 60;

export async function POST(request: Request) {
  const auth = await requireRole("boss", "admin", "supervisor");
  if ("error" in auth) return auth.error;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const data = parsed.data;

  const scheduleDates = data.repeatUntil ? datesBetween(data.schedDate, data.repeatUntil) : [data.schedDate];
  if (data.repeatUntil && data.repeatUntil < data.schedDate) {
    return NextResponse.json(
      { error: "结束日期不能早于开始日期 End date must be after start date" },
      { status: 400 },
    );
  }
  if (scheduleDates.length > MAX_REPEAT_DAYS) {
    return NextResponse.json(
      { error: `一次最多重复 ${MAX_REPEAT_DAYS} 天 Can only repeat up to ${MAX_REPEAT_DAYS} days at once` },
      { status: 400 },
    );
  }

  try {
    for (const d of [data.schedDate, data.repeatUntil].filter((x): x is string => !!x)) {
      assertSchedulableDate(d);
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid date" },
      { status: 400 },
    );
  }

  // Supervisors may only assign jobs to their own subordinates (or themselves).
  if (auth.session.user.role === "supervisor") {
    const [target] = await db.select().from(users).where(eq(users.id, data.assignedTo)).limit(1);
    const isSelf = data.assignedTo === auth.session.user.id;
    const isOwnSubordinate = target?.supervisorId === auth.session.user.id;
    if (!isSelf && !isOwnSubordinate) {
      return NextResponse.json(
        { error: "只能分配给自己团队的员工 You can only assign jobs to your own team" },
        { status: 403 },
      );
    }
  }

  let pay = "0";
  let property: string | null = null;
  if (data.jobTypeId) {
    const [jt] = await db.select().from(jobTypes).where(eq(jobTypes.id, data.jobTypeId)).limit(1);
    if (jt) pay = jt.pay;
  }
  if (data.unitId) {
    const [unit] = await db.select().from(units).where(eq(units.id, data.unitId)).limit(1);
    if (unit) property = unit.property;
  }

  const created = await db
    .insert(jobs)
    .values(
      scheduleDates.map((schedDate) => ({
        jobCode: generateJobCode(new Date(schedDate)),
        title: data.title,
        description: data.description,
        property,
        unitId: data.unitId,
        assignedTo: data.assignedTo,
        assignedBy: auth.session.user.id,
        schedDate,
        startTime: data.startTime,
        endTime: data.endTime,
        jobTypeId: data.jobTypeId,
        notes: data.notes,
        pay,
      })),
    )
    .returning();

  return NextResponse.json({ job: created[0], jobs: created, count: created.length }, { status: 201 });
}
