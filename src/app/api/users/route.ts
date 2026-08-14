import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";
import { generateTempPassword } from "@/lib/passwords";
import { nextUserCode } from "@/lib/user-code";
import { sendMail } from "@/lib/mailer";
import { welcomeEmailHtml } from "@/lib/welcome-email";

const bodySchema = z.object({
  name: z.string().min(1),
  staffId: z.string().optional(),
  username: z.string().min(3),
  email: z.string().email("请填写有效邮箱 Please enter a valid email"),
  role: z.enum(["boss", "admin", "supervisor", "employee"]),
  staffType: z.string().optional(),
  phone: z.string().optional(),
  payType: z.enum(["per_job", "base"]).default("per_job"),
  payRate: z.coerce.number().nonnegative().optional(),
  needCheckin: z.boolean().default(true),
  donePhotos: z.coerce.number().int().min(0).max(10).default(0),
});

export async function POST(request: Request) {
  const auth = await requireRole("boss", "admin");
  if ("error" in auth) return auth.error;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const data = parsed.data;

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);
  const userCode = await nextUserCode();

  const [created] = await db
    .insert(users)
    .values({
      userCode,
      staffId: data.staffId || null,
      name: data.name,
      username: data.username,
      email: data.email,
      passwordHash,
      mustChangePassword: true,
      role: data.role,
      staffType: data.staffType,
      phone: data.phone,
      payType: data.payType,
      payRate: data.payRate?.toFixed(2),
      needCheckin: data.needCheckin,
      donePhotos: data.donePhotos,
    })
    .returning();

  // Best-effort — a bad SMTP config or address shouldn't block account
  // creation. The temp password is also handed back in the response below
  // for the admin to relay manually if the email doesn't land.
  let emailSent = true;
  try {
    await sendMail({
      to: data.email,
      subject: "Your Bliss Rooms Job System account",
      html: welcomeEmailHtml(data.name, data.username, tempPassword),
    });
  } catch (err) {
    emailSent = false;
    console.error("Failed to send welcome email", err);
  }

  // Temp password is only ever returned here, in the create response — it is
  // never stored in plaintext or logged, and the account must change it on
  // first login (mustChangePassword). passwordHash never leaves the server.
  return NextResponse.json(
    { user: { ...created, passwordHash: undefined }, tempPassword, emailSent },
    { status: 201 },
  );
}
