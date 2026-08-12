import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

// Called periodically by a client heartbeat while the app is open. "Online"
// elsewhere in the app is just "lastSeenAt within the last minute" — no
// websocket/session tracking needed for a presence indicator this simple.
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, session.user.id));

  return NextResponse.json({ ok: true });
}
