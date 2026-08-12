import { NextResponse } from "next/server";
import { z } from "zod";
import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { chatGroups, chatGroupMembers, chatMessages } from "@/db/schema";
import { auth } from "@/auth";
import { requireRole } from "@/lib/api-auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await db
    .select({ groupId: chatGroupMembers.groupId })
    .from(chatGroupMembers)
    .where(eq(chatGroupMembers.userId, session.user.id));
  const groupIds = memberships.map((m) => m.groupId);
  if (groupIds.length === 0) {
    return NextResponse.json({ groups: [] });
  }

  const groups = await db
    .select()
    .from(chatGroups)
    .where(inArray(chatGroups.id, groupIds))
    .orderBy(desc(chatGroups.createdAt));

  const recentMessages = await db
    .select({ groupId: chatMessages.groupId, body: chatMessages.body, createdAt: chatMessages.createdAt })
    .from(chatMessages)
    .where(inArray(chatMessages.groupId, groupIds))
    .orderBy(desc(chatMessages.createdAt));
  const lastByGroup = new Map<string, { body: string; createdAt: Date }>();
  for (const m of recentMessages) {
    if (!lastByGroup.has(m.groupId)) lastByGroup.set(m.groupId, m);
  }

  const result = groups.map((g) => ({
    id: g.id,
    name: g.name,
    lastMessage: lastByGroup.get(g.id)?.body ?? null,
    lastMessageAt: lastByGroup.get(g.id)?.createdAt ?? null,
  }));

  return NextResponse.json({ groups: result });
}

const bodySchema = z.object({
  name: z.string().min(1),
  memberIds: z.array(z.string().uuid()).default([]),
});

// Only supervisors/admin/boss may open a new group chat.
export async function POST(request: Request) {
  const roleAuth = await requireRole("boss", "admin", "supervisor");
  if ("error" in roleAuth) return roleAuth.error;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const [group] = await db
    .insert(chatGroups)
    .values({ name: parsed.data.name, createdBy: roleAuth.session.user.id })
    .returning();

  const memberIds = Array.from(new Set([roleAuth.session.user.id, ...parsed.data.memberIds]));
  await db.insert(chatGroupMembers).values(memberIds.map((userId) => ({ groupId: group.id, userId })));

  return NextResponse.json({ group }, { status: 201 });
}
