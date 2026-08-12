import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { chatGroups, chatGroupMembers, chatMessages, users } from "@/db/schema";
import { ChatRoom } from "@/components/chat-room";

export default async function ChatGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const user = session!.user;

  const [group] = await db.select().from(chatGroups).where(eq(chatGroups.id, id)).limit(1);
  if (!group) notFound();

  const [membership] = await db
    .select()
    .from(chatGroupMembers)
    .where(and(eq(chatGroupMembers.groupId, id), eq(chatGroupMembers.userId, user.id)))
    .limit(1);
  if (!membership) notFound();

  const messages = await db
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

  const members = await db
    .select({ id: users.id, name: users.name })
    .from(chatGroupMembers)
    .innerJoin(users, eq(chatGroupMembers.userId, users.id))
    .where(eq(chatGroupMembers.groupId, id));

  return (
    <div className="flex h-[calc(100vh-8rem)] max-w-2xl flex-col">
      <h1 className="mb-3 text-lg font-semibold">{group.name}</h1>
      <ChatRoom
        groupId={id}
        currentUserId={user.id}
        initialMessages={messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
        members={members}
      />
    </div>
  );
}
