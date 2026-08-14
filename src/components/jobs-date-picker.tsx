"use client";

import { useRouter } from "next/navigation";
import { useLang } from "@/lib/use-lang";

export function JobsDatePicker({ value }: { value?: string }) {
  const router = useRouter();
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);

  return (
    <input
      type="date"
      defaultValue={value}
      onChange={(e) => {
        router.push(e.target.value ? `/jobs?date=${e.target.value}` : "/jobs");
      }}
      title={t("按日期查看", "Filter by date")}
      aria-label={t("按日期查看", "Filter by date")}
      className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
    />
  );
}
