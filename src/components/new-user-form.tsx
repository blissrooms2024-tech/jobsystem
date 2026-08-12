"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { STAFF_TYPE_SUGGESTIONS } from "@/lib/staff-types";

export function NewUserForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ username: string; tempPassword: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const needCheckinRef = useRef<HTMLInputElement>(null);
  const donePhotosRef = useRef<HTMLInputElement>(null);

  const onStaffTypeChange = (value: string) => {
    // Matches the legacy system: typing "Posting Agent" auto-switches this
    // employee to no-checkin + requires a completion photo (still editable after).
    if (value.trim().toLowerCase() === "posting agent") {
      if (needCheckinRef.current) needCheckinRef.current.checked = false;
      if (donePhotosRef.current) donePhotosRef.current.checked = true;
    }
  };

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
              staffId: String(formData.get("staffId") || "") || undefined,
              username: String(formData.get("username") || ""),
              role: String(formData.get("role") || "employee"),
              staffType: String(formData.get("staffType") || "") || undefined,
              phone: String(formData.get("phone") || "") || undefined,
              payRate: String(formData.get("payRate") || "") || undefined,
              needCheckin: formData.get("needCheckin") === "on",
              donePhotos: formData.get("donePhotos") === "on" ? "1" : "0",
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
        <input name="staffId" placeholder="员工编号 Staff ID" className="input" />
        <input name="username" placeholder="用户名 Username" required className="input" />
        <select name="role" className="input" defaultValue="employee">
          <option value="employee">Employee</option>
          <option value="supervisor">Supervisor</option>
          <option value="admin">Admin</option>
          <option value="boss">Boss</option>
        </select>
        <input
          name="staffType"
          list="staffTypeSuggestions"
          placeholder="工种 Staff type"
          className="input"
          onChange={(e) => onStaffTypeChange(e.target.value)}
        />
        <datalist id="staffTypeSuggestions">
          {STAFF_TYPE_SUGGESTIONS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <input name="phone" placeholder="电话 Phone" className="input" />
        <input name="payRate" type="number" step="0.01" placeholder="单价 Pay rate" className="input" />
        <label className="col-span-2 flex items-center gap-2 text-sm">
          <input ref={needCheckinRef} type="checkbox" name="needCheckin" defaultChecked />
          需要 GPS 打卡 Requires GPS check-in
        </label>
        <label className="col-span-2 flex items-center gap-2 text-sm">
          <input ref={donePhotosRef} type="checkbox" name="donePhotos" />
          不打卡时，需要上传完成照片 Requires a completion photo (no check-in staff)
        </label>
        {error ? <p className="col-span-2 text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={isPending}
          className="col-span-2 rounded-md bg-purple-700 hover:bg-purple-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
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
