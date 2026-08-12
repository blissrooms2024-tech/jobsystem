import { sql } from "drizzle-orm";
import { db } from "@/db";
import { codeSequences } from "@/db/schema";

/**
 * Atomically claims the next integer for a named counter (e.g. "payroll",
 * "leave") via a single `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`.
 * Postgres takes a row lock on the counter row for the duration of that one
 * statement, so two requests racing to save at the same time are serialized
 * by the database itself — one gets N, the other gets N+1, never the same
 * number twice. This replaces an earlier `SELECT MAX(...) + 1` approach that
 * read-then-wrote non-atomically and could hand out the same number to two
 * concurrent requests (e.g. a double-click on Save), which surfaced as a
 * "duplicate key value violates unique constraint" error.
 */
async function nextSeq(name: string): Promise<number> {
  const [row] = await db
    .insert(codeSequences)
    .values({ name, value: 1 })
    .onConflictDoUpdate({
      target: codeSequences.name,
      set: { value: sql`${codeSequences.value} + 1` },
    })
    .returning({ value: codeSequences.value });
  return row.value;
}

/** Claims the next sequence number for `seqName` and inserts with it. */
export async function insertWithNextCode<T>(
  seqName: string,
  attempt: (code: string, seq: number) => Promise<T>,
  formatCode: (seq: number) => string,
): Promise<T> {
  const seq = await nextSeq(seqName);
  return attempt(formatCode(seq), seq);
}
