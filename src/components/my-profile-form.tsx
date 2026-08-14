"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bi } from "@/components/bi";

type Props = {
  phone: string | null;
  icPassport: string | null;
  address: string | null;
  email: string | null;
  emergencyContact: string | null;
  bankName: string | null;
  bankAccount: string | null;
  /** When true, the core fields (everything except email) must be filled
   * before this form can be submitted — used by the forced-completion gate. */
  requireCore?: boolean;
};

export function MyProfileForm({ requireCore, ...props }: Props) {
  const router = useRouter();
  const [error, setError] = useState<React.ReactNode>(null);
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
            phone: String(formData.get("phone") || ""),
            icPassport: String(formData.get("icPassport") || ""),
            address: String(formData.get("address") || ""),
            email: String(formData.get("email") || ""),
            emergencyContact: String(formData.get("emergencyContact") || ""),
            bankName: String(formData.get("bankName") || ""),
            bankAccount: String(formData.get("bankAccount") || ""),
          };
          const res = await fetch("/api/account/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            setError(<Bi zh="保存失败" en="Failed to save" />);
            return;
          }
          setSaved(true);
          router.refresh();
        });
      }}
    >
      <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
        <span className="font-medium"><Bi zh="电话" en="Phone" /></span>
        <input name="phone" defaultValue={props.phone ?? ""} required={requireCore} className="input" />
      </label>
      <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
        <span className="font-medium"><Bi zh="IC / 护照" en="IC / Passport" /></span>
        <input name="icPassport" defaultValue={props.icPassport ?? ""} required={requireCore} className="input" />
      </label>
      <label className="col-span-2 space-y-1 text-sm">
        <span className="font-medium"><Bi zh="地址" en="Address" /></span>
        <textarea name="address" defaultValue={props.address ?? ""} rows={2} required={requireCore} className="input" />
      </label>
      <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
        <span className="font-medium"><Bi zh="邮箱" en="Email" /></span>
        <input name="email" type="email" defaultValue={props.email ?? ""} className="input" />
      </label>
      <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
        <span className="font-medium"><Bi zh="紧急联系人" en="Emergency contact" /></span>
        <input name="emergencyContact" defaultValue={props.emergencyContact ?? ""} required={requireCore} className="input" />
      </label>
      <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
        <span className="font-medium"><Bi zh="银行" en="Bank name" /></span>
        <input name="bankName" defaultValue={props.bankName ?? ""} required={requireCore} className="input" />
      </label>
      <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
        <span className="font-medium"><Bi zh="银行账号" en="Bank account" /></span>
        <input name="bankAccount" defaultValue={props.bankAccount ?? ""} required={requireCore} className="input" />
      </label>

      {error ? <p className="col-span-2 text-sm text-red-600">{error}</p> : null}
      {saved ? (
        <p className="col-span-2 text-sm text-emerald-700">
          <Bi zh="已保存" en="Saved" />
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="col-span-2 rounded-md bg-purple-700 hover:bg-purple-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? <Bi zh="保存中..." en="Saving..." /> : <Bi zh="保存" en="Save" />}
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
