import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { chatGroups, chatGroupMembers, chatMessages, users } from "@/db/schema";
import { NewGroupForm } from "@/components/new-group-form";

export default async function ChatPage() {
  const session = await auth();
  const user = session!.user;
  const isAdmin = ["boss", "admin", "supervisor"].includes(user.role);

  const memberships = await db
    .select({ groupId: chatGroupMembers.groupId })
    .from(chatGroupMembers)
    .where(eq(chatGroupMembers.userId, user.id));
  const groupIds = memberships.map((m) => m.groupId);

  const groups = groupIds.length
    ? await db.select().from(chatGroups).where(inArray(chatGroups.id, groupIds)).orderBy(desc(chatGroups.createdAt))
    : [];

  const recentMessages = groupIds.length
    ? await db
        .select({ groupId: chatMessages.groupId, body: chatMessages.body, createdAt: chatMessages.createdAt })
        .from(chatMessages)
        .where(inArray(chatMessages.groupId, groupIds))
        .orderBy(desc(chatMessages.createdAt))
    : [];
  const lastByGroup = new Map<string, { body: string; createdAt: Date }>();
  for (const m of recentMessages) {
    if (!lastByGroup.has(m.groupId)) lastByGroup.set(m.groupId, m);
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
        <h1 className="text-lg font-semibold">聊天 Chat</h1>
      </div>

      {isAdmin ? <NewGroupForm users={activeUsers.filter((u) => u.id !== user.id)} /> : null}

      <div className="space-y-2">
        {groups.map((g) => {
          const last = lastByGroup.get(g.id);
          return (
            <Link
              key={g.id}
              href={`/chat/${g.id}`}
              className="block rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50"
            >
              <p className="font-medium">{g.name}</p>
              <p className="truncate text-xs text-neutral-500">{last?.body ?? "暂无消息 No messages yet"}</p>
            </Link>
          );
        })}
        {groups.length === 0 ? (
          <p className="text-sm text-neutral-400">
            {isAdmin ? "还没有群组，创建一个吧 No groups yet — create one above" : "还没有加入任何群组 Not in any groups yet"}
          </p>
        ) : null}
      </div>
    </div>
  );
}
