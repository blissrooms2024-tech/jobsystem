import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";
import { generateTempPassword } from "@/lib/passwords";
import { sendMail } from "@/lib/mailer";
import { appUrl } from "@/lib/app-url";

function resetEmailHtml(name: string, username: string, tempPassword: string) {
  const link = appUrl() || "";
  return `
    <p>Hi ${name},</p>
    <p>Your password on the Bliss Rooms Job System has been reset.</p>
    <p>
      Username: <strong>${username}</strong><br />
      New temporary password: <strong>${tempPassword}</strong>
    </p>
    <p>You will be asked to set a new password the next time you log in.</p>
    ${link ? `<p><a href="${link}/login">Log in here</a></p>` : ""}
  `;
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("boss", "admin");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const tempPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  const [updated] = await db
    .update(users)
    .set({ passwordHash, mustChangePassword: true })
    .where(eq(users.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let emailSent = false;
  if (updated.email) {
    try {
      await sendMail({
        to: updated.email,
        subject: "Your Bliss Rooms Job System password was reset",
        html: resetEmailHtml(updated.name, updated.username, tempPassword),
      });
      emailSent = true;
    } catch (err) {
      console.error("Failed to send password-reset email", err);
    }
  }

  return NextResponse.json({ tempPassword, emailSent });
}
