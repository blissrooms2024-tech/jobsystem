import { NextResponse } from "next/server";
import { z } from "zod";
import { and, asc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { chatGroupMembers, chatMessages, users } from "@/db/schema";
import { auth } from "@/auth";

async function isMember(groupId: string, userId: string) {
  const [membership] = await db
    .select()
    .from(chatGroupMembers)
    .where(and(eq(chatGroupMembers.groupId, groupId), eq(chatGroupMembers.userId, userId)))
    .limit(1);
  return !!membership;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!(await isMember(id, session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: chatMessages.id,
      body: chatMessages.body,
      createdAt: chatMessages.createdAt,
      senderId: chatMessages.senderId,
      senderName: users.name,
    })
    .from(chatMessages)
    .innerJoin(users, eq(chatMessages.senderId, users.id))
    .where(eq(chatMessages.groupId, id))
    .orderBy(asc(chatMessages.createdAt))
    .limit(200);

  // "Online" is just "seen in the last 60s" via the periodic presence
  // heartbeat — good enough for a small team, no websocket session tracking.
  const oneMinuteAgo = new Date(Date.now() - 60_000);
  const onlineRows = await db
    .select({ id: users.id })
    .from(chatGroupMembers)
    .innerJoin(users, eq(chatGroupMembers.userId, users.id))
    .where(and(eq(chatGroupMembers.groupId, id), gt(users.lastSeenAt, oneMinuteAgo)));

  // Viewing the group (i.e. fetching its messages) counts as reading it.
  await db
    .update(chatGroupMembers)
    .set({ lastReadAt: new Date() })
    .where(and(eq(chatGroupMembers.groupId, id), eq(chatGroupMembers.userId, session.user.id)));

  return NextResponse.json({ messages: rows, onlineCount: onlineRows.length });
}

const bodySchema = z.object({ body: z.string().min(1).max(2000) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!(await isMember(id, session.user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const [row] = await db
    .insert(chatMessages)
    .values({ groupId: id, senderId: session.user.id, body: parsed.data.body })
    .returning();

  // Sending a message also counts as having read up to that point.
  await db
    .update(chatGroupMembers)
    .set({ lastReadAt: new Date() })
    .where(and(eq(chatGroupMembers.groupId, id), eq(chatGroupMembers.userId, session.user.id)));

  return NextResponse.json({ message: row }, { status: 201 });
}
