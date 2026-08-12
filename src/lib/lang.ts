/**
 * Reads the current UI language from the `data-lang` attribute on <html>
 * (see src/app/layout.tsx + globals.css for how it's set/toggled). For use
 * only where the CSS-based <Bi> toggle can't apply — native browser dialogs
 * like confirm()/alert() render outside the DOM, so they need a plain string
 * picked at call time instead of a component.
 */
export function currentLang(): "zh" | "en" {
  if (typeof document === "undefined") return "zh";
  return document.documentElement.getAttribute("data-lang") === "en" ? "en" : "zh";
}

/** Picks zh or en text based on the current UI language. */
export function biText(zh: string, en: string): string {
  return currentLang() === "en" ? en : zh;
}
