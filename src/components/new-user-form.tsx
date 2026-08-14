"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { STAFF_TYPE_SUGGESTIONS } from "@/lib/staff-types";
import { Bi } from "@/components/bi";
import { useLang } from "@/lib/use-lang";

export function NewUserForm() {
  const router = useRouter();
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [error, setError] = useState<React.ReactNode>(null);
  const [created, setCreated] = useState<{ username: string; tempPassword: string; emailSent: boolean } | null>(null);
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
            <Bi zh="已创建账号" en="Account created:" /> <strong>{created.username}</strong>,{" "}
            <Bi zh="临时密码" en="Temp password" />:{" "}
            <code className="rounded bg-white px-1.5 py-0.5">{created.tempPassword}</code>
          </p>
          <p className="mt-1 text-xs text-emerald-700">
            {created.emailSent ? (
              <Bi
                zh="登录信息已发邮件给该员工。此密码不会再次显示，如需要也可以自行告知。"
                en="Login details have been emailed to the employee. This password won't be shown again, but you can also share it yourself if needed."
              />
            ) : (
              <Bi
                zh="邮件发送失败，请把此密码手动告知员工。此密码不会再次显示。"
                en="The email failed to send — please give this password to the employee yourself. It won't be shown again."
              />
            )}
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
              email: String(formData.get("email") || ""),
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
              const errData = await res.json().catch(() => ({}));
              setError(typeof errData.error === "string" ? errData.error : <Bi zh="创建失败" en="Failed to create" />);
              return;
            }
            const data = await res.json();
            setCreated({ username: data.user.username, tempPassword: data.tempPassword, emailSent: data.emailSent });
            router.refresh();
            (document.getElementById("new-user-form") as HTMLFormElement)?.reset();
          });
        }}
        id="new-user-form"
      >
        <input name="name" placeholder={t("姓名", "Name")} required className="input" />
        <input name="staffId" placeholder={t("员工编号", "Staff ID")} className="input" />
        <input name="username" placeholder={t("用户名", "Username")} required className="input" />
        <input
          name="email"
          type="email"
          placeholder={t("邮箱（用于发送登录信息）", "Email (for login details)")}
          required
          className="input col-span-2"
        />
        <select name="role" className="input" defaultValue="employee">
          <option value="employee">Employee</option>
          <option value="supervisor">Supervisor</option>
          <option value="admin">Admin</option>
          <option value="boss">Boss</option>
        </select>
        <input
          name="staffType"
          list="staffTypeSuggestions"
          placeholder={t("工种", "Staff type")}
          className="input"
          onChange={(e) => onStaffTypeChange(e.target.value)}
        />
        <datalist id="staffTypeSuggestions">
          {STAFF_TYPE_SUGGESTIONS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <input name="phone" placeholder={t("电话", "Phone")} className="input" />
        <input name="payRate" type="number" step="0.01" placeholder={t("单价", "Pay rate")} className="input" />
        <label className="col-span-2 flex items-center gap-2 text-sm">
          <input ref={needCheckinRef} type="checkbox" name="needCheckin" defaultChecked />
          <Bi zh="需要 GPS 打卡" en="Requires GPS check-in" />
        </label>
        <label className="col-span-2 flex items-center gap-2 text-sm">
          <input ref={donePhotosRef} type="checkbox" name="donePhotos" />
          <Bi zh="不打卡时，需要上传完成照片" en="Requires a completion photo (no check-in staff)" />
        </label>
        {error ? <p className="col-span-2 text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={isPending}
          className="col-span-2 rounded-md bg-purple-700 hover:bg-purple-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {isPending ? (
            t("创建中...", "Creating...")
          ) : (
            <>
              + <Bi zh="新增员工" en="Add employee" />
            </>
          )}
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
