import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Falls back to a syntactically-valid placeholder so `next build` (which
// imports every route module to collect metadata) doesn't crash before a
// real DATABASE_URL exists. Any actual query against the placeholder fails
// at request time with a clear connection error, not at build/import time.
const connectionString =
  process.env.DATABASE_URL ?? "postgresql://placeholder:placeholder@localhost/placeholder";

if (!process.env.DATABASE_URL) {
  console.warn(
    "[db] DATABASE_URL is not set — copy .env.local.example to .env.local and fill in your Neon connection string.",
  );
}

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
