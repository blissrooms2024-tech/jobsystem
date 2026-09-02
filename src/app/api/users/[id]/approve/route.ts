import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";
import { generateTempPassword } from "@/lib/passwords";
import { sendMail } from "@/lib/mailer";
import { welcomeEmailHtml } from "@/lib/welcome-email";

const bodySchema = z.object({
  staffType: z.string().min(1, "请填写工种 Staff type is required"),
  staffId: z.string().min(1, "请填写员工编号 Staff ID is required"),
  payRate: z.coerce.number().nonnegative().optional(),
  needCheckin: z.boolean().default(true),
});

export async function POST(
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

  const [pending] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!pending || !pending.pendingApproval) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [staffIdTaken] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.staffId, data.staffId))
    .limit(1);
  if (staffIdTaken) {
    return NextResponse.json(
      { error: "该员工编号已被使用 That staff ID is already in use" },
      { status: 409 },
    );
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const [updated] = await db
    .update(users)
    .set({
      staffType: data.staffType,
      staffId: data.staffId,
      payRate: data.payRate?.toFixed(2),
      needCheckin: data.needCheckin,
      passwordHash,
      mustChangePassword: true,
      active: true,
      pendingApproval: false,
      // Otherwise sweepInactiveUsers() measures from the original signup
      // date (createdAt) — if approval sat pending for 7+ days, the account
      // would be auto-deactivated again before the new hire ever logs in.
      lastSeenAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();

  let emailSent = true;
  if (updated.email) {
    try {
      await sendMail({
        to: updated.email,
        subject: "Your Bliss Rooms Job System account is approved",
        html: welcomeEmailHtml(updated.name, updated.username, tempPassword),
      });
    } catch (err) {
      emailSent = false;
      console.error("Failed to send approval email", err);
    }
  } else {
    emailSent = false;
  }

  return NextResponse.json({
    user: { ...updated, passwordHash: undefined },
    tempPassword,
    emailSent,
  });
}
