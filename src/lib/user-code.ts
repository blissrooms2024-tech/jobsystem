import { sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/** Next `U001`-style code, continuing the legacy sheet's numbering. */
export async function nextUserCode(): Promise<string> {
  const [row] = await db
    .select({
      max: sql<number | null>`max(cast(substring(${users.userCode} from 2) as integer))`,
    })
    .from(users);
  const next = (row?.max ?? 0) + 1;
  return `U${String(next).padStart(3, "0")}`;
}
