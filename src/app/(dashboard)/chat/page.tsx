import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { chatGroups, chatGroupMembers, chatMessages, users } from "@/db/schema";
import { NewGroupForm } from "@/components/new-group-form";
import { NotificationPermissionButton } from "@/components/notification-permission-button";
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
          createdAt: chatMessages.createdAt,
          senderId: chatMessages.senderId,
        })
        .from(chatMessages)
        .where(inArray(chatMessages.groupId, groupIds))
        .orderBy(desc(chatMessages.createdAt))
    : [];
  const lastByGroup = new Map<string, { body: string; createdAt: Date }>();
  for (const m of recentMessages) {
    if (!lastByGroup.has(m.groupId)) lastByGroup.set(m.groupId, m);
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

      <div className="space-y-2">
        {groups.map((g) => {
          const last = lastByGroup.get(g.id);
          const unread = unreadByGroup.get(g.id) ?? 0;
          return (
            <Link
              key={g.id}
              href={`/chat/${g.id}`}
              className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{g.name}</p>
                <p className="truncate text-xs text-neutral-500">
                  {last?.body ?? <Bi zh="暂无消息" en="No messages yet" />}
                </p>
              </div>
              {unread > 0 ? (
                <span className="ml-3 shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              ) : null}
            </Link>
          );
        })}
        {groups.length === 0 ? (
          <p className="text-sm text-neutral-400">
            {isAdmin ? (
              <Bi zh="还没有群组，创建一个吧" en="No groups yet — create one above" />
            ) : (
              <Bi zh="还没有加入任何群组" en="Not in any groups yet" />
            )}
          </p>
        ) : null}
      </div>
    </div>
  );
}
