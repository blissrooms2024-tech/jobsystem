// Starting suggestions for the free-text Project field. Projects change over
// time, so this is NOT a fixed list — admins and posting agents can type any
// project name, and every name already used on a job is suggested too.
export const JOB_PROJECT_OPTIONS = [
  "PENANG",
  "CEMARA",
  "MUDAH/IBILIK",
  "PIXEL CITY/NIKKA",
  "MIDAH",
];

export function mergeProjectSuggestions(used: (string | null)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of [...JOB_PROJECT_OPTIONS, ...used]) {
    const v = p?.trim();
    if (v && !seen.has(v.toUpperCase())) {
      seen.add(v.toUpperCase());
      out.push(v);
    }
  }
  return out;
}

/** Normalises a typed project name (trimmed, upper-case to match the list). */
export function normalizeProject(value: string | null | undefined): string | null {
  const v = value?.trim();
  return v ? v.toUpperCase() : null;
}
