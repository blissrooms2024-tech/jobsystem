import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { leaves, users } from "@/db/schema";
import { auth } from "@/auth";
import { generateLeaveCode } from "@/lib/codes";
import { insertWithNextCode } from "@/lib/sequence";
import { sendMail } from "@/lib/mailer";
import { appUrl } from "@/lib/app-url";
import { ADMIN_NOTIFY_EMAIL } from "@/lib/admin-notify";

const bodySchema = z.object({
  type: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  days: z.coerce.number().positive(),
  reason: z.string().optional(),
});

export async function POST(request: Request) {
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

  const created = await insertWithNextCode(
    "leave",
    async (leaveCode) => {
      const [row] = await db
        .insert(leaves)
        .values({
          leaveCode,
          userId: session.user.id,
          type: data.type,
          startDate: data.startDate,
          endDate: data.endDate,
          days: data.days.toFixed(1),
          reason: data.reason,
        })
        .returning();
      return row;
    },
    generateLeaveCode,
  );

  try {
    const [applicant] = await db.select({ name: users.name }).from(users).where(eq(users.id, session.user.id)).limit(1);
    const link = appUrl();
    await sendMail({
      to: ADMIN_NOTIFY_EMAIL,
      subject: `Leave request — ${applicant?.name ?? session.user.username}`,
      html: `
        <p>${applicant?.name ?? session.user.username} submitted a leave request:</p>
        <ul>
          <li>Type: ${data.type}</li>
          <li>Dates: ${data.startDate} ~ ${data.endDate} (${data.days} day${data.days === 1 ? "" : "s"})</li>
          ${data.reason ? `<li>Reason: ${data.reason}</li>` : ""}
        </ul>
        ${link ? `<p><a href="${link}/leaves/${created.id}">Review this request</a></p>` : ""}
      `,
    });
  } catch (err) {
    console.error("Failed to notify admin of leave request", err);
  }

  return NextResponse.json({ leave: created }, { status: 201 });
}
