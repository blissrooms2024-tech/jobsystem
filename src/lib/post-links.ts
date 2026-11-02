// A job can carry several post links (e.g. one Mudah + one iBilik post that
// get approved on different days). They're stored newline-separated in the
// existing `jobs.post_link` text column, so no schema migration is needed and
// old single-link jobs read back as a one-item list.

export function parsePostLinks(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export function serializePostLinks(links: string[]): string | null {
  const clean = links.map((l) => l.trim()).filter(Boolean);
  return clean.length > 0 ? clean.join("\n") : null;
}

/**
 * Accepts a pasted link, adding https:// when the scheme is missing. Returns
 * null for anything that isn't a plain http(s) URL (so e.g. `javascript:`
 * can never end up in an href).
 */
export function normalizePostLink(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Normalises every link; returns the bad one (if any) so the API can reject it. */
export function cleanPostLinks(links: string[]): { links: string[]; invalid: string | null } {
  const out: string[] = [];
  for (const raw of links) {
    if (!raw.trim()) continue;
    const n = normalizePostLink(raw);
    if (!n) return { links: [], invalid: raw.trim() };
    out.push(n);
  }
  return { links: out, invalid: null };
}
