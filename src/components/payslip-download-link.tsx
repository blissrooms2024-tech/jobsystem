"use client";

import { useLang } from "@/lib/use-lang";

export function PayslipDownloadLink({ payrollId }: { payrollId: string }) {
  const lang = useLang();
  const label = lang === "en" ? "Download PDF" : "下载 PDF";

  return (
    <a
      href={`/api/payroll/${payrollId}/pdf`}
      title={label}
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
      className="rounded-md border border-neutral-200 px-2 py-1.5 text-sm hover:bg-white"
    >
      ⬇️
    </a>
  );
}
