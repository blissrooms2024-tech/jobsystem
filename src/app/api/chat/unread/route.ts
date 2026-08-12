import { NextResponse } from "next/server";
import { and, eq, gt, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { chatGroupMembers, chatMessages } from "@/db/schema";

// Polled globally (not just on the chat page) to drive the nav badge and
// browser notification popups — unread per group is "messages newer than
// my lastReadAt for that group, not sent by me".
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      groupId: chatGroupMembers.groupId,
      unread: sql<number>`count(${chatMessages.id})`,
    })
    .from(chatGroupMembers)
    .leftJoin(
      chatMessages,
      and(
        eq(chatMessages.groupId, chatGroupMembers.groupId),
        gt(chatMessages.createdAt, chatGroupMembers.lastReadAt),
        sql`${chatMessages.senderId} != ${session.user.id}`,
      ),
    )
    .where(eq(chatGroupMembers.userId, session.user.id))
    .groupBy(chatGroupMembers.groupId);

  const groups = rows.map((r) => ({ groupId: r.groupId, unread: Number(r.unread) }));
  const total = groups.reduce((sum, g) => sum + g.unread, 0);

  return NextResponse.json({ total, groups });
}
