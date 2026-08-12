import { insertWithNextCode } from "@/lib/sequence";

/** Next `U001`-style code, continuing the legacy sheet's numbering. */
export async function nextUserCode(): Promise<string> {
  return insertWithNextCode(
    "user",
    async (code) => code,
    (seq) => `U${String(seq).padStart(3, "0")}`,
  );
}
