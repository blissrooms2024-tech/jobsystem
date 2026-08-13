import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { chatGroupMembers } from "@/db/schema";
import { auth } from "@/auth";

// "Clear chat" is per-member and local — it hides history from this
// user's view only (like WhatsApp's Clear Chat), never deletes messages
// for other members. Use the group Delete instead to wipe everything.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [membership] = await db
    .select()
    .from(chatGroupMembers)
    .where(and(eq(chatGroupMembers.groupId, id), eq(chatGroupMembers.userId, session.user.id)))
    .limit(1);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db
    .update(chatGroupMembers)
    .set({ clearedAt: new Date() })
    .where(and(eq(chatGroupMembers.groupId, id), eq(chatGroupMembers.userId, session.user.id)));

  return NextResponse.json({ ok: true });
}
