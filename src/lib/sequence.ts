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

function isUniqueViolation(err: unknown, constraintName: string): boolean {
  let cur: unknown = err;
  for (let i = 0; i < 5 && cur; i++) {
    const e = cur as { code?: string; constraint?: string; cause?: unknown };
    if (e.code === "23505" && (!e.constraint || e.constraint === constraintName)) return true;
    cur = e.cause;
  }
  return false;
}

/**
 * Reads the next sequence number and inserts, retrying with a fresh number
 * on a unique-constraint collision (`nextSequenceNumber` reads-then-writes,
 * so two requests racing between the read and the insert can both compute
 * the same "next" number — e.g. a double-click on Save). Not a true atomic
 * sequence, but self-healing under that race instead of failing outright.
 */
export async function insertWithNextCode<T>(
  table: PgTable,
  codeColumn: SQLWrapper,
  prefixLength: number,
  constraintName: string,
  attempt: (code: string, seq: number) => Promise<T>,
  formatCode: (seq: number) => string,
  maxRetries = 5,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= maxRetries; i++) {
    const seq = await nextSequenceNumber(table, codeColumn, prefixLength);
    try {
      return await attempt(formatCode(seq), seq);
    } catch (err) {
      if (isUniqueViolation(err, constraintName) && i < maxRetries) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}
