"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bi } from "@/components/bi";

export function PayrollEditForm({
  payrollId,
  baseSalary,
  allowance,
  deduction,
  note,
  editable,
}: {
  payrollId: string;
  baseSalary: string;
  allowance: string;
  deduction: string;
  note: string | null;
  editable: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<React.ReactNode>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid max-w-md grid-cols-2 gap-3"
      action={(formData: FormData) => {
        setError(null);
        startTransition(async () => {
          const res = await fetch(`/api/payroll/${payrollId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              baseSalary: String(formData.get("baseSalary") || "0"),
              allowance: String(formData.get("allowance") || "0"),
              deduction: String(formData.get("deduction") || "0"),
              note: String(formData.get("note") || ""),
            }),
          });
          if (!res.ok) {
            setError(<Bi zh="保存失败" en="Failed to save" />);
            return;
          }
          router.refresh();
        });
      }}
    >
      <label className="col-span-1 space-y-1 text-sm">
        <span className="font-medium"><Bi zh="底薪" en="Base salary" /></span>
        <input
          name="baseSalary"
          type="number"
          step="0.01"
          disabled={!editable}
          defaultValue={baseSalary}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 disabled:bg-neutral-50"
        />
      </label>
      <label className="col-span-1 space-y-1 text-sm">
        <span className="font-medium"><Bi zh="津贴" en="Allowance" /></span>
        <input
          name="allowance"
          type="number"
          step="0.01"
          disabled={!editable}
          defaultValue={allowance}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 disabled:bg-neutral-50"
        />
      </label>
      <label className="col-span-1 space-y-1 text-sm">
        <span className="font-medium"><Bi zh="扣款" en="Deduction" /></span>
        <input
          name="deduction"
          type="number"
          step="0.01"
          disabled={!editable}
          defaultValue={deduction}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 disabled:bg-neutral-50"
        />
      </label>
      <label className="col-span-2 space-y-1 text-sm">
        <span className="font-medium"><Bi zh="备注" en="Note" /></span>
        <textarea
          name="note"
          disabled={!editable}
          defaultValue={note ?? ""}
          rows={2}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 disabled:bg-neutral-50"
        />
      </label>
      {error ? <p className="col-span-2 text-sm text-red-600">{error}</p> : null}
      {editable ? (
        <button
          type="submit"
          disabled={isPending}
          className="col-span-2 rounded-md bg-purple-700 hover:bg-purple-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending ? <Bi zh="保存中..." en="Saving..." /> : <Bi zh="保存" en="Save" />}
        </button>
      ) : null}
    </form>
  );
}
