"use client";

import { useState } from "react";
import { PayslipView } from "@/components/payslip-view";
import type { PayslipData } from "@/lib/payslip-pdf";
import { Bi } from "@/components/bi";

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
        {open ? <Bi zh="隐藏预览" en="Hide preview" /> : <Bi zh="预览" en="Preview" />}
      </button>
      {open ? (
        <div className="mt-4">
          <PayslipView data={data} />
        </div>
      ) : null}
    </div>
  );
}
