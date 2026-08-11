import { sql, type SQLWrapper } from "drizzle-orm";
import { db } from "@/db";
import type { PgTable } from "drizzle-orm/pg-core";

/**
 * Picks the next sequential integer for a `PREFIX0001`-style code column by
 * reading the highest existing numeric suffix. Good enough for this app's
 * write volume (admin-triggered payroll/leave creation, not high-concurrency
 * user traffic) — a `SERIAL`-backed sequence would be overkill here since the
 * codes must stay human-legible with a letter prefix.
 */
export async function nextSequenceNumber(
  table: PgTable,
  codeColumn: SQLWrapper,
  prefixLength: number,
): Promise<number> {
  const [row] = await db
    .select({
      max: sql<number | null>`max(cast(substring(${codeColumn} from ${prefixLength + 1}) as integer))`,
    })
    .from(table);
  return (row?.max ?? 0) + 1;
}
