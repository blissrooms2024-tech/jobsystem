/**
 * Bilingual text: renders both languages, CSS (driven by data-lang on
 * <html>, see globals.css) shows only one at a time. Works in both server
 * and client components with no re-fetch or locale routing needed.
 */
export function Bi({ zh, en }: { zh: string; en: string }) {
  return (
    <>
      <span className="i18n-zh">{zh}</span>
      <span className="i18n-en">{en}</span>
    </>
  );
}
