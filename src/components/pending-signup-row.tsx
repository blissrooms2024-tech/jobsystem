"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { STAFF_TYPE_SUGGESTIONS } from "@/lib/staff-types";
import { Bi } from "@/components/bi";
import { useLang } from "@/lib/use-lang";

type Props = {
  id: string;
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  icPassport: string | null;
  address: string | null;
  emergencyContact: string | null;
  bankName: string | null;
  bankAccount: string | null;
};

export function PendingSignupRow(props: Props) {
  const router = useRouter();
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [isPending, startTransition] = useTransition();
  const [staffType, setStaffType] = useState("");
  const [staffId, setStaffId] = useState("");
  const [staffIdTouched, setStaffIdTouched] = useState(false);
  const [payRate, setPayRate] = useState("");
  const [needCheckin, setNeedCheckin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState<{ tempPassword: string; emailSent: boolean } | null>(null);

  const suggestStaffId = (type: string) => {
    if (staffIdTouched || !type.trim()) return;
    fetch(`/api/staff-id-suggestion?staffType=${encodeURIComponent(type)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.staffId) setStaffId(data.staffId);
      })
      .catch(() => {});
  };

  const approve = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/users/${props.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          staffType,
          staffId,
          payRate: payRate || undefined,
          needCheckin,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("批准失败", "Failed to approve"));
        return;
      }
      setApproved({ tempPassword: data.tempPassword, emailSent: data.emailSent });
    });
  };

  const reject = () => {
    if (!confirm(t(`拒绝 ${props.name} 的注册申请？此操作无法撤销。`, `Reject ${props.name}'s signup request? This can't be undone.`)))
      return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/users/${props.id}/reject`, { method: "POST" });
      if (!res.ok) {
        setError(t("拒绝失败", "Failed to reject"));
        return;
      }
      router.refresh();
    });
  };

  if (approved) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
        <p className="font-medium text-emerald-900">
          {props.name} · <Bi zh="已批准" en="Approved" />
        </p>
        <p className="mt-1">
          <Bi zh="临时密码" en="Temp password" />: <code className="rounded bg-white px-1">{approved.tempPassword}</code>
        </p>
        <p className={approved.emailSent ? "text-emerald-700" : "text-amber-700"}>
          {approved.emailSent ? (
            <Bi zh="已发邮件通知员工" en="Emailed to the employee" />
          ) : (
            <Bi zh="邮件未发送，请手动告知" en="Email not sent — please tell them yourself" />
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">
          {props.name} <span className="text-xs text-neutral-400">{props.username}</span>
        </p>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-600 sm:grid-cols-3">
        <Field labelZh="邮箱" labelEn="Email" value={props.email} />
        <Field labelZh="电话" labelEn="Phone" value={props.phone} />
        <Field labelZh="IC/护照" labelEn="IC/Passport" value={props.icPassport} />
        <Field labelZh="紧急联系人" labelEn="Emergency" value={props.emergencyContact} />
        <Field labelZh="银行" labelEn="Bank" value={[props.bankName, props.bankAccount].filter(Boolean).join(" · ") || null} />
        <Field labelZh="地址" labelEn="Address" value={props.address} />
      </dl>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
          <span className="font-medium"><Bi zh="工种" en="Staff type" /> *</span>
          <input
            list="staff-type-suggestions"
            value={staffType}
            onChange={(e) => {
              setStaffType(e.target.value);
              suggestStaffId(e.target.value);
            }}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="col-span-2 space-y-1 text-sm sm:col-span-1">
          <span className="font-medium"><Bi zh="员工编号" en="Staff ID" /> *</span>
          <input
            value={staffId}
            onChange={(e) => {
              setStaffId(e.target.value);
              setStaffIdTouched(true);
            }}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="col-span-1 space-y-1 text-sm">
          <span className="font-medium"><Bi zh="单价 (RM)" en="Pay rate (RM)" /></span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={payRate}
            onChange={(e) => setPayRate(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="col-span-1 flex items-end gap-2 text-sm">
          <input type="checkbox" checked={needCheckin} onChange={(e) => setNeedCheckin(e.target.checked)} />
          <span><Bi zh="需要打卡" en="Needs check-in" /></span>
        </label>
      </div>

      <datalist id="staff-type-suggestions">
        {STAFF_TYPE_SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          disabled={isPending || !staffType.trim() || !staffId.trim()}
          onClick={approve}
          className="rounded-md bg-purple-700 hover:bg-purple-800 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          <Bi zh="批准" en="Approve" />
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={reject}
          className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
        >
          <Bi zh="拒绝" en="Reject" />
        </button>
      </div>
    </div>
  );
}

function Field({ labelZh, labelEn, value }: { labelZh: string; labelEn: string; value: string | null }) {
  return (
    <div>
      <dt className="text-neutral-400">
        <Bi zh={labelZh} en={labelEn} />
      </dt>
      <dd>{value || "-"}</dd>
    </div>
  );
}
