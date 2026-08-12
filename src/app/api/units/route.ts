import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { units } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";

const bodySchema = z.object({
  unitCode: z.string().min(1),
  unitName: z.string().min(1),
  property: z.string().optional(),
  address: z.string().optional(),
  lat: z.coerce.number(),
  lon: z.coerce.number(),
  radiusM: z.coerce.number().int().positive(),
});

export async function POST(request: Request) {
  const auth = await requireRole("boss", "admin", "supervisor");
  if ("error" in auth) return auth.error;

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const [created] = await db.insert(units).values(parsed.data).returning();
  return NextResponse.json({ unit: created }, { status: 201 });
}
