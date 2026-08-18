/**
 * Word-prefix match — searching "k" finds "Khin", not "worK" — instead of a
 * plain substring-anywhere match, which gets confusingly broad once some
 * field (e.g. a shared unit name like "Work From Home") happens to contain
 * the query letters in the middle of an unrelated word.
 */
export function matchesQuery(fields: (string | null | undefined)[], query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = fields.filter(Boolean).join(" ").toLowerCase();
  return haystack.split(/\s+/).some((word) => word.startsWith(q));
}
