import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { payroll } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";

const bodySchema = z.object({
  baseSalary: z.string().optional(),
  allowance: z.string().optional(),
  deduction: z.string().optional(),
  note: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("boss", "admin");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const [existing] = await db.select().from(payroll).where(eq(payroll.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status === "paid") {
    return NextResponse.json({ error: "Cannot edit a paid payslip" }, { status: 409 });
  }

  const [updated] = await db
    .update(payroll)
    .set(parsed.data)
    .where(eq(payroll.id, id))
    .returning();

  return NextResponse.json({ payroll: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("boss", "admin");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const [existing] = await db.select().from(payroll).where(eq(payroll.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.status === "paid") {
    return NextResponse.json(
      { error: "已发放的工资单不能删除，请先撤销发放 Unpay it first before deleting" },
      { status: 409 },
    );
  }

  await db.delete(payroll).where(eq(payroll.id, id));
  return NextResponse.json({ ok: true });
}
