import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { chatGroupMembers } from "@/db/schema";

export async function POST(
  request: Request,
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

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(`chat/${id}/`)) {
          throw new Error("Invalid upload path");
        }
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/heic",
            "image/gif",
            // Voice messages — container varies by browser's MediaRecorder support.
            "audio/webm",
            "audio/webm;codecs=opus",
            "audio/mp4",
            "audio/ogg",
          ],
          maximumSizeInBytes: 15 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // No DB write here — the client calls the messages POST endpoint
        // afterward with the confirmed blob URL as the attachment.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("chat photo-upload token generation failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 },
    );
  }
}
