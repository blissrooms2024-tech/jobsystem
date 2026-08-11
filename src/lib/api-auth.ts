import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { Role } from "@/types/next-auth";

/**
 * Resolves the current session for an API route. Returns either
 * `{ session }` or `{ error }` — callers should `return error` immediately
 * when present. Kept as a discriminated result (not a throw) so route
 * handlers stay linear and every unauthenticated/unauthorized path is
 * explicit at the call site.
 */
export async function requireRole(...allowed: Role[]) {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }
  if (allowed.length > 0 && !allowed.includes(session.user.role)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const;
  }
  return { session } as const;
}
