import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { units } from "@/db/schema";
import { requireRole } from "@/lib/api-auth";

const bodySchema = z.object({
  unitName: z.string().min(1).optional(),
  property: z.string().optional(),
  address: z.string().optional(),
  lat: z.coerce.number().optional(),
  lon: z.coerce.number().optional(),
  radiusM: z.coerce.number().int().positive().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireRole("boss", "admin", "supervisor");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }
  const data = parsed.data;

  const [updated] = await db
    .update(units)
    .set({
      ...(data.unitName !== undefined ? { unitName: data.unitName } : {}),
      ...(data.property !== undefined ? { property: data.property || null } : {}),
      ...(data.address !== undefined ? { address: data.address || null } : {}),
      ...(data.lat !== undefined ? { lat: data.lat } : {}),
      ...(data.lon !== undefined ? { lon: data.lon } : {}),
      ...(data.radiusM !== undefined ? { radiusM: data.radiusM } : {}),
    })
    .where(eq(units.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ unit: updated });
}
