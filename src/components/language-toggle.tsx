"use client";

import { useState } from "react";
import { notifyLangChange } from "@/lib/use-lang";

export function LanguageToggle() {
  const [lang, setLangState] = useState<"zh" | "en">(() =>
    typeof document !== "undefined" && document.documentElement.getAttribute("data-lang") === "en"
      ? "en"
      : "zh",
  );

  const choose = (l: "zh" | "en") => {
    document.documentElement.setAttribute("data-lang", l);
    document.cookie = `lang=${l}; path=/; max-age=31536000`;
    setLangState(l);
    notifyLangChange();
  };

  const base = "rounded px-1.5 py-0.5 text-xs font-medium";
  const active = "bg-purple-700 text-white sm:bg-white sm:text-purple-900";
  const inactive = "text-neutral-500 sm:text-purple-200";

  return (
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => choose("zh")} className={`${base} ${lang === "zh" ? active : inactive}`}>
        中文
      </button>
      <button type="button" onClick={() => choose("en")} className={`${base} ${lang === "en" ? active : inactive}`}>
        EN
      </button>
    </div>
  );
}
