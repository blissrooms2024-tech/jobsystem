import { desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { chatGroups, chatGroupMembers, chatMessages, users } from "@/db/schema";
import { NewGroupForm } from "@/components/new-group-form";
import { NotificationPermissionButton } from "@/components/notification-permission-button";
import { ChatGroupsClient } from "@/components/chat-groups-client";
import { Bi } from "@/components/bi";

export default async function ChatPage() {
  const session = await auth();
  const user = session!.user;
  const isAdmin = ["boss", "admin", "supervisor"].includes(user.role);

  const memberships = await db
    .select({ groupId: chatGroupMembers.groupId, lastReadAt: chatGroupMembers.lastReadAt })
    .from(chatGroupMembers)
    .where(eq(chatGroupMembers.userId, user.id));
  const groupIds = memberships.map((m) => m.groupId);
  const lastReadByGroup = new Map(memberships.map((m) => [m.groupId, m.lastReadAt]));

  const groups = groupIds.length
    ? await db.select().from(chatGroups).where(inArray(chatGroups.id, groupIds)).orderBy(desc(chatGroups.createdAt))
    : [];

  const recentMessages = groupIds.length
    ? await db
        .select({
          groupId: chatMessages.groupId,
          body: chatMessages.body,
          attachmentUrl: chatMessages.attachmentUrl,
          deletedAt: chatMessages.deletedAt,
          createdAt: chatMessages.createdAt,
          senderId: chatMessages.senderId,
        })
        .from(chatMessages)
        .where(inArray(chatMessages.groupId, groupIds))
        .orderBy(desc(chatMessages.createdAt))
    : [];
  const lastByGroup = new Map<string, { body: string; createdAt: Date }>();
  for (const m of recentMessages) {
    if (!lastByGroup.has(m.groupId)) {
      const preview = m.deletedAt
        ? "此消息已删除"
        : m.attachmentUrl && !m.body
          ? m.attachmentUrl.includes("/voice-")
            ? "[语音]"
            : "[照片]"
          : m.body;
      lastByGroup.set(m.groupId, { body: preview, createdAt: m.createdAt });
    }
  }

  // recentMessages is already fetched (for the last-message preview) with
  // no per-group limit, so unread-per-group can just be filtered in JS
  // against each group's lastReadAt rather than a second query.
  const unreadByGroup = new Map<string, number>();
  for (const groupId of groupIds) {
    const lastRead = lastReadByGroup.get(groupId);
    const count = recentMessages.filter(
      (m) => m.groupId === groupId && m.senderId !== user.id && m.createdAt > (lastRead ?? new Date(0)),
    ).length;
    if (count > 0) unreadByGroup.set(groupId, count);
  }

  const activeUsers = isAdmin
    ? await db
        .select({ id: users.id, name: users.name, role: users.role })
        .from(users)
        .where(eq(users.active, true))
    : [];

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          <Bi zh="聊天" en="Chat" />
        </h1>
        <NotificationPermissionButton />
      </div>

      {isAdmin ? <NewGroupForm users={activeUsers.filter((u) => u.id !== user.id)} /> : null}

      <ChatGroupsClient
        isAdmin={isAdmin}
        groups={groups.map((g) => ({
          id: g.id,
          name: g.name,
          lastMessage: lastByGroup.get(g.id)?.body ?? null,
          unread: unreadByGroup.get(g.id) ?? 0,
        }))}
      />
    </div>
  );
}
