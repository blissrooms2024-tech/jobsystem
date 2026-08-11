import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";
import { generateTempPassword } from "@/lib/passwords";
import { nextUserCode } from "@/lib/user-code";

const bodySchema = z.object({
  name: z.string().min(1),
  username: z.string().min(3),
  role: z.enum(["boss", "admin", "supervisor", "employee"]),
  staffType: z.enum(["posting_agent", "cleaner"]).optional(),
  phone: z.string().optional(),
  payType: z.enum(["per_job", "base"]).default("per_job"),
  payRate: z.coerce.number().nonnegative().optional(),
  needCheckin: z.boolean().default(true),
});

export async function POST(request: Request) {
  const auth = await requireRole("boss", "admin");
  if ("error" in auth) return auth.error;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);
  const userCode = await nextUserCode();

  const [created] = await db
    .insert(users)
    .values({
      userCode,
      name: data.name,
      username: data.username,
      passwordHash,
      mustChangePassword: true,
      role: data.role,
      staffType: data.staffType,
      phone: data.phone,
      payType: data.payType,
      payRate: data.payRate?.toFixed(2),
      needCheckin: data.needCheckin,
    })
    .returning();

  // Temp password is only ever returned here, in the create response — it is
  // never stored in plaintext or logged, and the account must change it on
  // first login (mustChangePassword).
  return NextResponse.json({ user: created, tempPassword }, { status: 201 });
}
