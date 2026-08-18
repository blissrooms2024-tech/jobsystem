"use client";

import { useRouter } from "next/navigation";
import { useLang } from "@/lib/use-lang";

type Option = { id: string; label: string };

export function JobsAssigneeFilter({
  value,
  options,
  status,
  date,
  month,
  showAll,
}: {
  value?: string;
  options: Option[];
  status?: string;
  date?: string;
  month: string;
  showAll: boolean;
}) {
  const router = useRouter();
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);

  return (
    <select
      defaultValue={value ?? ""}
      onChange={(e) => {
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        if (date) params.set("date", date);
        else params.set("month", showAll ? "all" : month);
        if (e.target.value) params.set("assignee", e.target.value);
        router.push(`/jobs?${params.toString()}`);
      }}
      title={t("按员工筛选", "Filter by employee")}
      aria-label={t("按员工筛选", "Filter by employee")}
      className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
    >
      <option value="">{t("全部员工", "All employees")}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
