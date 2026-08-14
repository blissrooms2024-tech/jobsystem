import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { nextStaffId } from "@/lib/staff-id";

export async function GET(request: Request) {
  const auth = await requireRole("boss", "admin");
  if ("error" in auth) return auth.error;

  const staffType = new URL(request.url).searchParams.get("staffType") || "";
  if (!staffType.trim()) {
    return NextResponse.json({ error: "Missing staffType" }, { status: 400 });
  }

  const staffId = await nextStaffId(staffType);
  return NextResponse.json({ staffId });
}
