import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";
import { generateJobCode } from "@/lib/codes";

const bodySchema = z.object({
  schedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "请选择日期 Please pick a date"),
});

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

  const [created] = await db
    .insert(jobs)
    .values({
      jobCode: generateJobCode(new Date(parsed.data.schedDate)),
      title: source.title,
      description: source.description,
      property: source.property,
      unitId: source.unitId,
      assignedTo: source.assignedTo,
      assignedBy: auth.session.user.id,
      schedDate: parsed.data.schedDate,
      startTime: source.startTime,
      endTime: source.endTime,
      jobTypeId: source.jobTypeId,
      notes: source.notes,
      pay: source.pay,
    })
    .returning();

  return NextResponse.json({ job: created }, { status: 201 });
}
