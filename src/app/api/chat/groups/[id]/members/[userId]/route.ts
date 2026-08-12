import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { chatGroups, chatGroupMembers } from "@/db/schema";
import { auth } from "@/auth";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, userId } = await params;
  const [group] = await db.select().from(chatGroups).where(eq(chatGroups.id, id)).limit(1);
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // The creator can remove anyone (except themselves — delete the group
  // instead); any member can remove themselves (leave the group).
  const isSelf = userId === session.user.id;
  const isCreator = group.createdBy === session.user.id;
  if (!isSelf && !isCreator) {
    return NextResponse.json(
      { error: "只有开群的人能移除成员 Only the group creator can remove members" },
      { status: 403 },
    );
  }
  if (isSelf && isCreator) {
    return NextResponse.json(
      { error: "开群的人不能退出，只能解散群组 The creator can't leave — delete the group instead" },
      { status: 409 },
    );
  }

  await db
    .delete(chatGroupMembers)
    .where(and(eq(chatGroupMembers.groupId, id), eq(chatGroupMembers.userId, userId)));

  return NextResponse.json({ ok: true });
}
