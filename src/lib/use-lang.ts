"use client";

import { useSyncExternalStore } from "react";

type Lang = "zh" | "en";
const listeners = new Set<() => void>();

/** Called by LanguageToggle after it flips data-lang, so subscribers re-render. */
export function notifyLangChange() {
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): Lang {
  return document.documentElement.getAttribute("data-lang") === "en" ? "en" : "zh";
}

function getServerSnapshot(): Lang {
  return "zh";
}

/**
 * Reactive current-language hook, for the handful of cases the CSS-based
 * <Bi> toggle can't reach — HTML attribute values (placeholder, title,
 * aria-label) don't have a DOM node CSS can show/hide, so they need the
 * component to actually re-render with the other language's string.
 */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
