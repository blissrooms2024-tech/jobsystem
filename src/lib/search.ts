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
  // Pure-digit queries (phone numbers, bank/IC numbers, payroll codes) search
  // as a substring anywhere — useful for looking up by the last few digits,
  // where prefix-only matching would never find anything.
  if (/^\d+$/.test(q)) return haystack.includes(q);
  return haystack.split(/\s+/).some((word) => word.startsWith(q));
}
