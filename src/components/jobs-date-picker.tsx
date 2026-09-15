"use client";

import { useRouter } from "next/navigation";
import { useLang } from "@/lib/use-lang";

export function JobsDatePicker({
  value,
  status,
  assignee,
}: {
  value?: string;
  status?: string;
  assignee?: string;
}) {
  const router = useRouter();
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);

  return (
    <input
      type="date"
      defaultValue={value}
      onChange={(e) => {
        if (!e.target.value) {
          router.push("/jobs");
          return;
        }
        const params = new URLSearchParams();
        params.set("date", e.target.value);
        if (status) params.set("status", status);
        if (assignee) params.set("assignee", assignee);
        router.push(`/jobs?${params.toString()}`);
      }}
      title={t("按日期查看", "Filter by date")}
      aria-label={t("按日期查看", "Filter by date")}
      className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
    />
  );
}
