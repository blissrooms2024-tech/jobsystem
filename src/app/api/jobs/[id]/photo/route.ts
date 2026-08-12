import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { get } from "@vercel/blob";
import { auth } from "@/auth";
import { db } from "@/db";
import { jobs, users } from "@/db/schema";
import { parsePhotos } from "@/lib/photos";

export const runtime = "nodejs";

// Job photos live in a private Blob store, so their stored URLs aren't
// directly fetchable by a browser <img> tag — this streams the bytes
// through a route that can check the requester actually has access to
// the job first.
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

  const known = parsePhotos(job.photos).some((p) => p.url === url);
  if (!known) {
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
