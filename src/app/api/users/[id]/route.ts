import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { chatGroups, payroll, users } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";
import { bilingualError } from "@/lib/api-error";

const bodySchema = z.object({
  active: z.boolean().optional(),
  role: z.enum(["boss", "admin", "supervisor", "employee"]).optional(),
  payRate: z.coerce.number().nonnegative().optional(),
  name: z.string().min(1).optional(),
  staffId: z.string().optional(),
  phone: z.string().optional(),
  staffType: z.string().nullable().optional(),
  icPassport: z.string().optional(),
  address: z.string().optional(),
  email: z.string().optional(),
  emergencyContact: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  fbProfileLink: z.string().optional(),
  unitIds: z.array(z.string().uuid()).nullable().optional(),
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

  // Reactivating a previously-inactive user must restart their 7-day
  // inactivity countdown from now — otherwise sweepInactiveUsers() (which
  // measures from lastSeenAt/createdAt) sees the same stale timestamp and
  // deactivates them again on its very next run before they get a chance
  // to log back in.
  let reactivating = false;
  if (data.active === true) {
    const [existing] = await db.select({ active: users.active }).from(users).where(eq(users.id, id)).limit(1);
    reactivating = existing ? !existing.active : false;
  }

  const [updated] = await db
    .update(users)
    .set({
      ...(data.active !== undefined ? { active: data.active } : {}),
      ...(reactivating ? { lastSeenAt: new Date() } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.payRate !== undefined ? { payRate: data.payRate.toFixed(2) } : {}),
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.staffId !== undefined ? { staffId: data.staffId || null } : {}),
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
      ...(data.fbProfileLink !== undefined ? { fbProfileLink: data.fbProfileLink || null } : {}),
      ...(data.unitIds !== undefined ? { unitIds: data.unitIds?.length ? data.unitIds : null } : {}),
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("boss", "admin");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (id === auth.session.user.id) {
    return bilingualError("不能删除自己的账号", "You can't delete your own account", 409);
  }

  const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Jobs/leaves keep their history (assignedTo/userId either go null or
  // cascade appropriately) — but payroll records and chat groups this
  // person created are real shared history other people depend on, so
  // block the delete rather than silently losing or cascading them.
  const [payrollRow] = await db.select({ id: payroll.id }).from(payroll).where(eq(payroll.userId, id)).limit(1);
  if (payrollRow) {
    return bilingualError(
      "该员工有工资记录，不能删除，请改用停用",
      "This user has payroll records — deactivate the account instead of deleting it",
      409,
    );
  }

  const [groupRow] = await db.select({ id: chatGroups.id }).from(chatGroups).where(eq(chatGroups.createdBy, id)).limit(1);
  if (groupRow) {
    return bilingualError(
      "该员工创建了聊天群组，请先解散或转移群组",
      "This user created chat group(s) — delete or hand those off first",
      409,
    );
  }

  await db.delete(users).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}
