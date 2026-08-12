import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

const bodySchema = z.object({
  phone: z.string().optional(),
  icPassport: z.string().optional(),
  address: z.string().optional(),
  email: z.string().optional(),
  emergencyContact: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
});

// Self-service profile editing — any logged-in user can update their own
// contact/bank details. Role, pay rate, staff type, active status etc. stay
// admin-only (see /api/users/[id]).
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const data = parsed.data;

  const [updated] = await db
    .update(users)
    .set({
      ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
      ...(data.icPassport !== undefined ? { icPassport: data.icPassport || null } : {}),
      ...(data.address !== undefined ? { address: data.address || null } : {}),
      ...(data.email !== undefined ? { email: data.email || null } : {}),
      ...(data.emergencyContact !== undefined
        ? { emergencyContact: data.emergencyContact || null }
        : {}),
      ...(data.bankName !== undefined ? { bankName: data.bankName || null } : {}),
      ...(data.bankAccount !== undefined ? { bankAccount: data.bankAccount || null } : {}),
    })
    .where(eq(users.id, session.user.id))
    .returning();

  return NextResponse.json({ user: { ...updated, passwordHash: undefined } });
}
