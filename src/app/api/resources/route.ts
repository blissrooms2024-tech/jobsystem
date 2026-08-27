import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { resources } from "@/db/schema";
import { auth } from "@/auth";
import { requireRole } from "@/lib/api-auth";

const bodySchema = z.object({
  type: z.enum(["guideline", "tutorial", "contact", "drive_link"]),
  title: z.string().min(1),
  content: z.string().optional(),
  url: z.string().optional(),
  unitIds: z.array(z.string().uuid()).nullable().optional(),
  staffType: z.string().nullable().optional(),
  userId: z.string().uuid().nullable().optional(),
});

// Any logged-in user can read resources — employees need to see them.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await db.select().from(resources).orderBy(resources.type, resources.title);
  return NextResponse.json({ resources: rows });
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
    .insert(resources)
    .values({
      type: data.type,
      title: data.title,
      content: data.content || null,
      url: data.url || null,
      unitIds: data.unitIds?.length ? data.unitIds : null,
      staffType: data.staffType || null,
      userId: data.userId || null,
      createdBy: auth.session.user.id,
    })
    .returning();

  return NextResponse.json({ resource: created }, { status: 201 });
}
