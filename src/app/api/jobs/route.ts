import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { jobTypes, jobs, units, users } from "@/db/schema";
import { generateJobCode } from "@/lib/codes";
import { requireRole } from "@/lib/api-auth";
import { assertSchedulableDate } from "@/lib/job-timing";
import { eq } from "drizzle-orm";

const bodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  unitId: z.string().uuid().optional(),
  assignedTo: z.string().uuid(),
  schedDate: z.string(), // yyyy-mm-dd
  startTime: z.string().optional(), // HH:mm
  endTime: z.string().optional(),
  jobTypeId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const auth = await requireRole("boss", "admin", "supervisor");
  if ("error" in auth) return auth.error;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  try {
    assertSchedulableDate(data.schedDate);
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

  const [created] = await db
    .insert(jobs)
    .values({
      jobCode: generateJobCode(new Date(data.schedDate)),
      title: data.title,
      description: data.description,
      property,
      unitId: data.unitId,
      assignedTo: data.assignedTo,
      assignedBy: auth.session.user.id,
      schedDate: data.schedDate,
      startTime: data.startTime,
      endTime: data.endTime,
      jobTypeId: data.jobTypeId,
      notes: data.notes,
      pay,
    })
    .returning();

  return NextResponse.json({ job: created }, { status: 201 });
}
