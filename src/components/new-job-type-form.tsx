"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function NewJobTypeForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex max-w-md gap-2"
      action={(formData: FormData) => {
        setError(null);
        startTransition(async () => {
          const payload = {
            typeName: String(formData.get("typeName") || ""),
            pay: String(formData.get("pay") || "0"),
          };
          const res = await fetch("/api/job-types", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            setError("创建失败 Failed to create");
            return;
          }
          router.refresh();
          (document.getElementById("new-job-type-form") as HTMLFormElement)?.reset();
        });
      }}
      id="new-job-type-form"
    >
      <input
        name="typeName"
        placeholder="工种名称 Type name"
        required
        className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      <input
        name="pay"
        type="number"
        step="0.01"
        placeholder="单价 Pay"
        required
        className="w-32 rounded-md border border-neutral-300 px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        + 新增 Add
      </button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
