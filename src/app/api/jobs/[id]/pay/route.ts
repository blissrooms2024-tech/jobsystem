import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";

const bodySchema = z.object({ pay: z.coerce.number().nonnegative() });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("boss", "admin");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "请输入有效金额 Enter a valid amount" }, { status: 400 });
  }

  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.payrollId) {
    return NextResponse.json(
      { error: "此任务已计入工资单，不能改金额 Already attached to a payslip — cannot change pay" },
      { status: 409 },
    );
  }

  const [updated] = await db
    .update(jobs)
    .set({ pay: parsed.data.pay.toFixed(2) })
    .where(eq(jobs.id, id))
    .returning();

  return NextResponse.json({ job: updated });
}
