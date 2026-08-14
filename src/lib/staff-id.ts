import { like } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

// Matches the prefixes already in use in the migrated data (PA001...,
// C001...) plus the rest of the STAFF_TYPE_SUGGESTIONS list.
const STAFF_TYPE_PREFIX: Record<string, string> = {
  cleaner: "C",
  "room agent": "RA",
  "posting agent": "PA",
  maintenance: "MT",
  installer: "IN",
  handyman: "HM",
  electrician: "EL",
  plumber: "PL",
  aircond: "AC",
  general: "GN",
};

export function staffIdPrefix(staffType: string): string {
  const key = staffType.trim().toLowerCase();
  if (STAFF_TYPE_PREFIX[key]) return STAFF_TYPE_PREFIX[key];
  // Unknown/custom staff type — fall back to the initials of each word.
  const initials = staffType
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "ST";
}

/**
 * Next `<PREFIX><NNN>`-style staff ID for a given staff type, continuing
 * from whatever's already in the table — including IDs that were typed in
 * by hand before this existed (e.g. PA001..PA035, C001).
 */
export async function nextStaffId(staffType: string): Promise<string> {
  const prefix = staffIdPrefix(staffType);
  const rows = await db
    .select({ staffId: users.staffId })
    .from(users)
    .where(like(users.staffId, `${prefix}%`));

  const pattern = new RegExp(`^${prefix}(\\d+)$`);
  let max = 0;
  for (const row of rows) {
    const match = row.staffId ? pattern.exec(row.staffId) : null;
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}
