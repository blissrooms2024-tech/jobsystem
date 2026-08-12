"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { STAFF_TYPE_SUGGESTIONS } from "@/lib/staff-types";

type Props = {
  userId: string;
  name: string;
  staffId: string | null;
  phone: string | null;
  staffType: string | null;
  icPassport: string | null;
  address: string | null;
  email: string | null;
  emergencyContact: string | null;
  bankName: string | null;
  bankAccount: string | null;
  payRate: string | null;
  needCheckin: boolean;
  donePhotos: number;
};

export function UserProfileForm(props: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid max-w-2xl grid-cols-2 gap-3"
      action={(formData: FormData) => {
        setError(null);
        setSaved(false);
        startTransition(async () => {
          const payload = {
            name: String(formData.get("name") || ""),
            staffId: String(formData.get("staffId") || ""),
            phone: String(formData.get("phone") || ""),
            staffType: String(formData.get("staffType") || "") || null,
            icPassport: String(formData.get("icPassport") || ""),
            address: String(formData.get("address") || ""),
            email: String(formData.get("email") || ""),
            emergencyContact: String(formData.get("emergencyContact") || ""),
            bankName: String(formData.get("bankName") || ""),
            bankAccount: String(formData.get("bankAccount") || ""),
            payRate: String(formData.get("payRate") || "") || undefined,
            needCheckin: formData.get("needCheckin") === "on",
            donePhotos: String(formData.get("donePhotos") || "0"),
          };
          const res = await fetch(`/api/users/${props.userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            setError("保存失败 Failed to save");
            return;
          }
          setSaved(true);
          router.refresh();
        });
      }}
    >
      <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
        <span className="font-medium">姓名 Name</span>
        <input name="name" defaultValue={props.name} required className="input" />
      </label>
      <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
        <span className="font-medium">员工编号 Staff ID</span>
        <input name="staffId" defaultValue={props.staffId ?? ""} className="input" />
      </label>
      <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
        <span className="font-medium">电话 Phone</span>
        <input name="phone" defaultValue={props.phone ?? ""} className="input" />
      </label>
      <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
        <span className="font-medium">工种 Staff type</span>
        <input name="staffType" list="staffTypeSuggestions" defaultValue={props.staffType ?? ""} className="input" />
        <datalist id="staffTypeSuggestions">
          {STAFF_TYPE_SUGGESTIONS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </label>
      <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
        <span className="font-medium">单价 Pay rate</span>
        <input name="payRate" type="number" step="0.01" defaultValue={props.payRate ?? ""} className="input" />
      </label>
      <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
        <span className="font-medium">IC / 护照 IC/Passport</span>
        <input name="icPassport" defaultValue={props.icPassport ?? ""} className="input" />
      </label>
      <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
        <span className="font-medium">邮箱 Email</span>
        <input name="email" type="email" defaultValue={props.email ?? ""} className="input" />
      </label>
      <label className="col-span-2 space-y-1 text-sm">
        <span className="font-medium">地址 Address</span>
        <textarea name="address" defaultValue={props.address ?? ""} rows={2} className="input" />
      </label>
      <label className="col-span-2 space-y-1 text-sm">
        <span className="font-medium">紧急联系人 Emergency contact</span>
        <input name="emergencyContact" defaultValue={props.emergencyContact ?? ""} className="input" />
      </label>
      <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
        <span className="font-medium">银行 Bank name</span>
        <input name="bankName" defaultValue={props.bankName ?? ""} className="input" />
      </label>
      <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
        <span className="font-medium">银行账号 Bank account</span>
        <input name="bankAccount" defaultValue={props.bankAccount ?? ""} className="input" />
      </label>
      <label className="col-span-2 flex items-center gap-2 text-sm">
        <input type="checkbox" name="needCheckin" defaultChecked={props.needCheckin} />
        需要 GPS 打卡 Requires GPS check-in
      </label>
      <label className="col-span-2 space-y-1 text-sm">
        <span className="font-medium">不打卡时，完成任务需要几张照片 Photos required to mark done (0 = none)</span>
        <input name="donePhotos" type="number" min={0} max={10} defaultValue={props.donePhotos} className="input" />
      </label>

      {error ? <p className="col-span-2 text-sm text-red-600">{error}</p> : null}
      {saved ? <p className="col-span-2 text-sm text-emerald-700">已保存 Saved</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="col-span-2 rounded-md bg-purple-700 hover:bg-purple-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "保存中... Saving..." : "保存 Save"}
      </button>

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid #d4d4d4;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 14px;
        }
      `}</style>
    </form>
  );
}
