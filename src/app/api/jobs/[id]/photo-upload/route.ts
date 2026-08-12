import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobs, users } from "@/db/schema";

// Client-side upload flow: the browser asks this route for a short-lived
// upload token, then PUTs the file straight to Vercel Blob. Keeps large
// photo uploads (site photos from a phone camera) off the serverless
// function's request body entirely.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const isOwner = job.assignedTo === session.user.id;
  const isFullAdmin = ["boss", "admin"].includes(session.user.role);
  let isOwnTeam = false;
  if (!isOwner && !isFullAdmin && session.user.role === "supervisor" && job.assignedTo) {
    const [assignee] = await db.select().from(users).where(eq(users.id, job.assignedTo)).limit(1);
    isOwnTeam = assignee?.supervisorId === session.user.id;
  }
  if (!isOwner && !isFullAdmin && !isOwnTeam) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as HandleUploadBody;
  const tokenPresent = !!process.env.BLOB_READ_WRITE_TOKEN;
  const tokenLength = process.env.BLOB_READ_WRITE_TOKEN?.length ?? 0;
  console.log("photo-upload: BLOB_READ_WRITE_TOKEN present?", tokenPresent, "length", tokenLength);

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(`jobs/${id}/`)) {
          throw new Error("Invalid upload path");
        }
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"],
          maximumSizeInBytes: 15 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // No DB write here — the client calls /api/jobs/[id]/photos afterward
        // to append the confirmed blob URL to the job's photo list.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("photo-upload token generation failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 400 },
    );
  }
}
