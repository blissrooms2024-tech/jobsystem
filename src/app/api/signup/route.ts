import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { nextUserCode } from "@/lib/user-code";
import { sendMail } from "@/lib/mailer";
import { appUrl } from "@/lib/app-url";

const bodySchema = z.object({
  name: z.string().min(1, "请填写姓名 Please enter your name"),
  username: z.string().min(3, "用户名至少 3 个字 Username must be at least 3 characters"),
  email: z.string().email("请填写有效邮箱 Please enter a valid email"),
  phone: z.string().optional(),
  icPassport: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
});

// Public endpoint — anyone can submit a signup request, but the account
// they create is inert (active: false) until an admin approves it and
// fills in the staff-type/staff-ID/pay-rate fields that only admins should
// set. See /api/users/[id]/approve.
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const data = parsed.data;

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.username, data.username))
    .limit(1);
  if (existing) {
    return NextResponse.json(
      { error: "用户名已被使用 That username is already taken" },
      { status: 409 },
    );
  }

  // Never shown to anyone — just satisfies the NOT NULL column until an
  // admin approves the account and a real temp password is generated.
  const placeholderHash = await bcrypt.hash(randomBytes(24).toString("hex"), 12);
  const userCode = await nextUserCode();

  const [created] = await db
    .insert(users)
    .values({
      userCode,
      name: data.name,
      username: data.username,
      email: data.email,
      passwordHash: placeholderHash,
      mustChangePassword: true,
      role: "employee",
      active: false,
      pendingApproval: true,
      phone: data.phone || null,
      icPassport: data.icPassport || null,
      address: data.address || null,
      emergencyContact: data.emergencyContact || null,
      bankName: data.bankName || null,
      bankAccount: data.bankAccount || null,
    })
    .returning({ id: users.id });

  // Best-effort nudge to admins/boss so a signup doesn't sit unnoticed —
  // never blocks the signup itself.
  try {
    const approvers = await db
      .select({ email: users.email })
      .from(users)
      .where(inArray(users.role, ["boss", "admin"]));
    const link = appUrl();
    await Promise.all(
      approvers
        .filter((a) => a.email)
        .map((a) =>
          sendMail({
            to: a.email!,
            subject: "New employee signup request",
            html: `
              <p>${data.name} (${data.username}) just requested an account on the Bliss Rooms Job System.</p>
              ${link ? `<p><a href="${link}/users/pending">Review pending signups</a></p>` : ""}
            `,
          }),
        ),
    );
  } catch (err) {
    console.error("Failed to notify admins of new signup", err);
  }

  return NextResponse.json({ id: created.id }, { status: 201 });
}
