import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { courseCompletions, courses } from "@/db/schema";

// Self-reported "I've watched this" — any logged-in user can mark a course
// they can see as complete for themselves.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [course] = await db.select({ id: courses.id }).from(courses).where(eq(courses.id, id)).limit(1);
  if (!course) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [existing] = await db
    .select()
    .from(courseCompletions)
    .where(and(eq(courseCompletions.courseId, id), eq(courseCompletions.userId, session.user.id)))
    .limit(1);
  if (existing) {
    return NextResponse.json({ completion: existing });
  }

  const [created] = await db
    .insert(courseCompletions)
    .values({ courseId: id, userId: session.user.id })
    .returning();

  return NextResponse.json({ completion: created }, { status: 201 });
}
