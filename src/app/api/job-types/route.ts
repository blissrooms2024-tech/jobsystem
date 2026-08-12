import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { jobTypes } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";

const bodySchema = z.object({
  typeName: z.string().min(1),
  pay: z.coerce.number().nonnegative(),
});

export async function POST(request: Request) {
  const auth = await requireRole("boss", "admin");
  if ("error" in auth) return auth.error;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const [created] = await db
    .insert(jobTypes)
    .values({ typeName: parsed.data.typeName, pay: parsed.data.pay.toFixed(2) })
    .returning();
  return NextResponse.json({ jobType: created }, { status: 201 });
}
