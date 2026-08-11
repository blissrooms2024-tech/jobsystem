"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function NewUserForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ username: string; tempPassword: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="max-w-lg space-y-3">
      {created ? (
        <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
          <p>
            已创建账号 <strong>{created.username}</strong>，临时密码 Temp password:{" "}
            <code className="rounded bg-white px-1.5 py-0.5">{created.tempPassword}</code>
          </p>
          <p className="mt-1 text-xs text-emerald-700">
            请把此密码告知员工，首次登录后系统会要求修改。此密码不会再次显示。
            <br />
            Give this to the employee now — it will not be shown again. They must change it on first login.
          </p>
        </div>
      ) : null}

      <form
        className="grid grid-cols-2 gap-3"
        action={(formData: FormData) => {
          setError(null);
          startTransition(async () => {
            const payload = {
              name: String(formData.get("name") || ""),
              username: String(formData.get("username") || ""),
              role: String(formData.get("role") || "employee"),
              staffType: String(formData.get("staffType") || "") || undefined,
              phone: String(formData.get("phone") || "") || undefined,
              payRate: String(formData.get("payRate") || "") || undefined,
              needCheckin: formData.get("needCheckin") === "on",
            };
            const res = await fetch("/api/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            if (!res.ok) {
              setError("创建失败 Failed to create");
              return;
            }
            const data = await res.json();
            setCreated({ username: data.user.username, tempPassword: data.tempPassword });
            router.refresh();
            (document.getElementById("new-user-form") as HTMLFormElement)?.reset();
          });
        }}
        id="new-user-form"
      >
        <input name="name" placeholder="姓名 Name" required className="input" />
        <input name="username" placeholder="用户名 Username" required className="input" />
        <select name="role" className="input" defaultValue="employee">
          <option value="employee">Employee</option>
          <option value="supervisor">Supervisor</option>
          <option value="admin">Admin</option>
          <option value="boss">Boss</option>
        </select>
        <select name="staffType" className="input" defaultValue="">
          <option value="">-- Staff type --</option>
          <option value="posting_agent">Posting Agent</option>
          <option value="cleaner">Cleaner</option>
        </select>
        <input name="phone" placeholder="电话 Phone" className="input" />
        <input name="payRate" type="number" step="0.01" placeholder="单价 Pay rate" className="input" />
        <label className="col-span-2 flex items-center gap-2 text-sm">
          <input type="checkbox" name="needCheckin" defaultChecked />
          需要 GPS 打卡 Requires GPS check-in
        </label>
        {error ? <p className="col-span-2 text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={isPending}
          className="col-span-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending ? "创建中..." : "+ 新增员工 Add employee"}
        </button>
        <style jsx>{`
          .input {
            border: 1px solid #d4d4d4;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 14px;
          }
        `}</style>
      </form>
    </div>
  );
}
