import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { chatGroups, chatGroupMembers } from "@/db/schema";
import { auth } from "@/auth";

const bodySchema = z.object({ userIds: z.array(z.string().uuid()).min(1) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [group] = await db.select().from(chatGroups).where(eq(chatGroups.id, id)).limit(1);
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (group.createdBy !== session.user.id) {
    return NextResponse.json(
      { error: "只有开群的人能添加成员 Only the group creator can add members" },
      { status: 403 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const existing = await db
    .select({ userId: chatGroupMembers.userId })
    .from(chatGroupMembers)
    .where(eq(chatGroupMembers.groupId, id));
  const existingIds = new Set(existing.map((r) => r.userId));
  const toAdd = parsed.data.userIds.filter((uid) => !existingIds.has(uid));

  if (toAdd.length > 0) {
    await db.insert(chatGroupMembers).values(toAdd.map((userId) => ({ groupId: id, userId })));
  }

  return NextResponse.json({ added: toAdd.length });
}
