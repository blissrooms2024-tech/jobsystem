import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { chatGroups, chatMessages } from "@/db/schema";
import { auth } from "@/auth";

const RECALL_WINDOW_MS = 5 * 60 * 1000;

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, messageId } = await params;
  const [message] = await db
    .select()
    .from(chatMessages)
    .where(and(eq(chatMessages.id, messageId), eq(chatMessages.groupId, id)))
    .limit(1);
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (message.deletedAt) return NextResponse.json({ ok: true });

  const [group] = await db.select().from(chatGroups).where(eq(chatGroups.id, id)).limit(1);
  const isGroupAdmin = group?.createdBy === session.user.id;
  const isSender = message.senderId === session.user.id;
  const withinRecallWindow = Date.now() - message.createdAt.getTime() < RECALL_WINDOW_MS;

  if (!isGroupAdmin && !(isSender && withinRecallWindow)) {
    return NextResponse.json(
      {
        error: isSender
          ? "只能在 5 分钟内撤回消息 You can only recall a message within 5 minutes"
          : "没有权限删除这条消息 You can't delete this message",
      },
      { status: 403 },
    );
  }

  await db.update(chatMessages).set({ deletedAt: new Date() }).where(eq(chatMessages.id, messageId));
  return NextResponse.json({ ok: true });
}
