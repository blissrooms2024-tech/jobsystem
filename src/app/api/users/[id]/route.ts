import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";

const bodySchema = z.object({
  active: z.boolean().optional(),
  role: z.enum(["boss", "admin", "supervisor", "employee"]).optional(),
  payRate: z.coerce.number().nonnegative().optional(),
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  staffType: z.string().nullable().optional(),
  icPassport: z.string().optional(),
  address: z.string().optional(),
  email: z.string().optional(),
  emergencyContact: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  needCheckin: z.boolean().optional(),
  donePhotos: z.coerce.number().int().min(0).max(10).optional(),
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
  const data = parsed.data;

  const [updated] = await db
    .update(users)
    .set({
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.payRate !== undefined ? { payRate: data.payRate.toFixed(2) } : {}),
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
      ...(data.staffType !== undefined ? { staffType: data.staffType } : {}),
      ...(data.icPassport !== undefined ? { icPassport: data.icPassport || null } : {}),
      ...(data.address !== undefined ? { address: data.address || null } : {}),
      ...(data.email !== undefined ? { email: data.email || null } : {}),
      ...(data.emergencyContact !== undefined
        ? { emergencyContact: data.emergencyContact || null }
        : {}),
      ...(data.bankName !== undefined ? { bankName: data.bankName || null } : {}),
      ...(data.bankAccount !== undefined ? { bankAccount: data.bankAccount || null } : {}),
      ...(data.needCheckin !== undefined ? { needCheckin: data.needCheckin } : {}),
      ...(data.donePhotos !== undefined ? { donePhotos: data.donePhotos } : {}),
    })
    .where(eq(users.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    user: { ...updated, passwordHash: undefined },
  });
}
