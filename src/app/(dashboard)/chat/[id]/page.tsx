import { notFound } from "next/navigation";
import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { chatGroups, chatGroupMembers, chatMessages, users } from "@/db/schema";
import { ChatRoom } from "@/components/chat-room";
import { Bi } from "@/components/bi";

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

  const rawMessages = await db
    .select({
      id: chatMessages.id,
      body: chatMessages.body,
      attachmentUrl: chatMessages.attachmentUrl,
      deletedAt: chatMessages.deletedAt,
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

  const isGroupAdmin = group.createdBy === user.id;

  return (
    <div className="flex h-[calc(100vh-8rem)] max-w-2xl flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">{group.name}</h1>
        {isGroupAdmin ? (
          <Link
            href={`/chat/${id}/settings`}
            className="rounded-md border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-50"
          >
            ⚙️ <Bi zh="设置" en="Settings" />
          </Link>
        ) : null}
      </div>
      <ChatRoom
        groupId={id}
        currentUserId={user.id}
        isGroupAdmin={isGroupAdmin}
        initialMessages={rawMessages.map((m) => ({
          id: m.id,
          body: m.deletedAt ? null : m.body,
          attachmentUrl: m.deletedAt ? null : m.attachmentUrl,
          deleted: !!m.deletedAt,
          createdAt: m.createdAt.toISOString(),
          senderId: m.senderId,
          senderName: m.senderName,
        }))}
        members={members}
      />
    </div>
  );
}
