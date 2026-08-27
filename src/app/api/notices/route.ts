import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notices } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";

const bodySchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// Management list — the employee-facing active banner is queried directly
// in the dashboard layout, not through this route.
export async function GET() {
  const auth = await requireRole("boss", "admin");
  if ("error" in auth) return auth.error;

  const rows = await db.select().from(notices).orderBy(desc(notices.createdAt));
  return NextResponse.json({ notices: rows });
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
    .insert(notices)
    .values({
      title: data.title,
      content: data.content || null,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      createdBy: auth.session.user.id,
    })
    .returning();

  return NextResponse.json({ notice: created }, { status: 201 });
}
