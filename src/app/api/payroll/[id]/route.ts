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
  const auth = await requireRole("boss", "admin", "supervisor");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
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
