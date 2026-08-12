"use client";

import { useState } from "react";
import { PayslipView } from "@/components/payslip-view";
import type { PayslipData } from "@/lib/payslip-pdf";

export function PayslipPreviewToggle({
  data,
  defaultOpen = false,
}: {
  data: PayslipData;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium whitespace-nowrap hover:bg-neutral-50"
      >
        {open ? "隐藏预览 Hide preview" : "预览 Preview"}
      </button>
      {open ? (
        <div className="mt-4">
          <PayslipView data={data} />
        </div>
      ) : null}
    </div>
  );
}
