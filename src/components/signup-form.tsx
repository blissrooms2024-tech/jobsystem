"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bi } from "@/components/bi";
import { useLang } from "@/lib/use-lang";

export function SignupForm() {
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (done) {
    return (
      <div className="w-full max-w-sm space-y-3 text-center">
        <p className="text-sm text-emerald-700">
          <Bi
            zh="提交成功！请等待管理员批准，批准后系统会发邮件给你账号密码。"
            en="Submitted! Please wait for admin approval — once approved, you'll get an email with your login details."
          />
        </p>
        <Link href="/login" className="text-sm text-purple-700 underline">
          <Bi zh="返回登录" en="Back to login" />
        </Link>
      </div>
    );
  }

  return (
    <form
      className="w-full max-w-md space-y-3"
      action={(formData: FormData) => {
        setError(null);
        startTransition(async () => {
          const payload = {
            name: String(formData.get("name") || ""),
            username: String(formData.get("username") || ""),
            email: String(formData.get("email") || ""),
            phone: String(formData.get("phone") || ""),
            icPassport: String(formData.get("icPassport") || ""),
            address: String(formData.get("address") || ""),
            emergencyContact: String(formData.get("emergencyContact") || ""),
            bankName: String(formData.get("bankName") || ""),
            bankAccount: String(formData.get("bankAccount") || ""),
          };
          const res = await fetch("/api/signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            setError(typeof data.error === "string" ? data.error : t("提交失败", "Failed to submit"));
            return;
          }
          setDone(true);
        });
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
          <span className="font-medium"><Bi zh="姓名" en="Name" /> *</span>
          <input name="name" required className="input" />
        </label>
        <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
          <span className="font-medium"><Bi zh="用户名" en="Username" /> *</span>
          <input name="username" required minLength={3} className="input" />
        </label>
        <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
          <span className="font-medium"><Bi zh="邮箱" en="Email" /> *</span>
          <input name="email" type="email" required className="input" />
        </label>
        <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
          <span className="font-medium"><Bi zh="电话" en="Phone" /></span>
          <input name="phone" className="input" />
        </label>
        <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
          <span className="font-medium"><Bi zh="IC / 护照" en="IC / Passport" /></span>
          <input name="icPassport" className="input" />
        </label>
        <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
          <span className="font-medium"><Bi zh="紧急联系人" en="Emergency contact" /></span>
          <input name="emergencyContact" className="input" />
        </label>
        <label className="col-span-2 space-y-1 text-sm">
          <span className="font-medium"><Bi zh="地址" en="Address" /></span>
          <textarea name="address" rows={2} className="input" />
        </label>
        <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
          <span className="font-medium"><Bi zh="银行" en="Bank name" /></span>
          <input name="bankName" className="input" />
        </label>
        <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
          <span className="font-medium"><Bi zh="银行账号" en="Bank account" /></span>
          <input name="bankAccount" className="input" />
        </label>
      </div>

      <p className="text-xs text-neutral-400">
        <Bi
          zh="工种、员工编号等资料会由管理员在批准时填写；没填完的资料也可以之后登录再补上。"
          en="Staff type, staff ID etc. will be filled in by an admin when approving. Anything left blank here can be filled in after your first login."
        />
      </p>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-purple-700 hover:bg-purple-800 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? <Bi zh="提交中..." en="Submitting..." /> : <Bi zh="提交注册申请" en="Submit signup request" />}
      </button>

      <p className="text-center text-sm">
        <Link href="/login" className="text-purple-700 underline">
          <Bi zh="已有账号？登录" en="Already have an account? Log in" />
        </Link>
      </p>

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
