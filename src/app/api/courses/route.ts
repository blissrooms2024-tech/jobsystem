import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { courses } from "@/db/schema";
import { auth } from "@/auth";
import { requireRole } from "@/lib/api-auth";

const bodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  videoUrl: z.string().min(1),
  jobTypeId: z.string().uuid().nullable().optional(),
});

// Any logged-in user can read courses — employees need to see them to train.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await db.select().from(courses).orderBy(courses.title);
  return NextResponse.json({ courses: rows });
}

export async function POST(request: Request) {
  const auth = await requireRole("boss", "admin");
  if ("error" in auth) return auth.error;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const data = parsed.data;

  const [created] = await db
    .insert(courses)
    .values({
      title: data.title,
      description: data.description || null,
      videoUrl: data.videoUrl,
      jobTypeId: data.jobTypeId || null,
      createdBy: auth.session.user.id,
    })
    .returning();

  return NextResponse.json({ course: created }, { status: 201 });
}
