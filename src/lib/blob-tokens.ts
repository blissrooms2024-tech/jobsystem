// The project moved to a new Vercel Blob store at some point, so older photo
// URLs point at the previous store, which the current BLOB_READ_WRITE_TOKEN
// can't read (Vercel answers 403 Forbidden). Old stores' read-write tokens
// can be listed in BLOB_EXTRA_READ_WRITE_TOKENS (comma-separated); each
// blob URL is then read/deleted with the token of the store it lives in.
//
// A token looks like `vercel_blob_rw_<storeId>_<secret>` and a blob URL like
// `https://<storeId>.private.blob.vercel-storage.com/...`, so the store id
// links the two.

function storeIdOfToken(token: string): string | null {
  const m = /^vercel_blob_rw_([a-z0-9]+)_/i.exec(token.trim());
  return m ? m[1].toLowerCase() : null;
}

function storeIdOfUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    if (!host.endsWith(".blob.vercel-storage.com")) return null;
    return host.split(".")[0].toLowerCase();
  } catch {
    return null;
  }
}

function allTokens(): string[] {
  const extra = (process.env.BLOB_EXTRA_READ_WRITE_TOKENS ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const main = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  return main ? [main, ...extra] : extra;
}

/** The token for the store a blob URL lives in (falls back to the main token). */
export function blobTokenForUrl(url: string): string | undefined {
  const storeId = storeIdOfUrl(url);
  const tokens = allTokens();
  if (storeId) {
    const match = tokens.find((t) => storeIdOfToken(t) === storeId);
    if (match) return match;
  }
  return tokens[0];
}

/** Groups blob URLs by the token that can operate on them. */
export function groupUrlsByToken(urls: string[]): Map<string | undefined, string[]> {
  const groups = new Map<string | undefined, string[]>();
  for (const url of urls) {
    const token = blobTokenForUrl(url);
    groups.set(token, [...(groups.get(token) ?? []), url]);
  }
  return groups;
}
