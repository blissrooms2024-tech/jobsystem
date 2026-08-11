import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { leaves } from "@/db/schema";
import { auth } from "@/auth";
import { generateLeaveCode } from "@/lib/codes";
import { nextSequenceNumber } from "@/lib/sequence";

const bodySchema = z.object({
  type: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  days: z.coerce.number().positive(),
  reason: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const seq = await nextSequenceNumber(leaves, leaves.leaveCode, 1);
  const leaveCode = generateLeaveCode(seq);

  const [created] = await db
    .insert(leaves)
    .values({
      leaveCode,
      userId: session.user.id,
      type: data.type,
      startDate: data.startDate,
      endDate: data.endDate,
      days: data.days.toFixed(1),
      reason: data.reason,
    })
    .returning();

  return NextResponse.json({ leave: created }, { status: 201 });
}
