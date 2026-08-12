import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { get } from "@vercel/blob";
import { auth } from "@/auth";
import { db } from "@/db";
import { chatGroupMembers, chatMessages } from "@/db/schema";

export const runtime = "nodejs";

// Chat photos live in a private Blob store, same as job photos — stream
// through a route that checks the requester is actually a member of the
// group the photo was posted in.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const [membership] = await db
    .select()
    .from(chatGroupMembers)
    .where(and(eq(chatGroupMembers.groupId, id), eq(chatGroupMembers.userId, session.user.id)))
    .limit(1);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [message] = await db
    .select({ id: chatMessages.id })
    .from(chatMessages)
    .where(and(eq(chatMessages.groupId, id), eq(chatMessages.attachmentUrl, url)))
    .limit(1);
  if (!message) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await get(url, { access: "private" });
  if (!result || result.statusCode !== 200) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || "image/jpeg",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
