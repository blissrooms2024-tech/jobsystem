import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { chatGroups, chatGroupMembers, users } from "@/db/schema";
import { auth } from "@/auth";

const bodySchema = z.object({ name: z.string().min(1) });

// Used by the floating chat widget to load a group's info + members
// on demand, without a full server-rendered page.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [group] = await db.select().from(chatGroups).where(eq(chatGroups.id, id)).limit(1);
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [membership] = await db
    .select()
    .from(chatGroupMembers)
    .where(and(eq(chatGroupMembers.groupId, id), eq(chatGroupMembers.userId, session.user.id)))
    .limit(1);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const members = await db
    .select({ id: users.id, name: users.name })
    .from(chatGroupMembers)
    .innerJoin(users, eq(chatGroupMembers.userId, users.id))
    .where(eq(chatGroupMembers.groupId, id));

  return NextResponse.json({
    group: { id: group.id, name: group.name },
    members,
    isGroupAdmin: group.createdBy === session.user.id,
  });
}

export async function PATCH(
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
      { error: "只有开群的人能改群名 Only the group creator can rename this group" },
      { status: 403 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const [updated] = await db
    .update(chatGroups)
    .set({ name: parsed.data.name })
    .where(eq(chatGroups.id, id))
    .returning();

  return NextResponse.json({ group: updated });
}

export async function DELETE(
  _request: Request,
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
      { error: "只有开群的人能解散群组 Only the group creator can delete this group" },
      { status: 403 },
    );
  }

  // chat_group_members and chat_messages both reference this group with
  // onDelete: "cascade", so a single delete here clears everything.
  await db.delete(chatGroups).where(eq(chatGroups.id, id));
  return NextResponse.json({ ok: true });
}
