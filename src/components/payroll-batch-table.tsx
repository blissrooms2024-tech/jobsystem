"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/utils";
import { addDays, firstOfMonth, lastOfMonth, todayISO } from "@/lib/pay-periods";
import { PayslipView } from "@/components/payslip-view";
import { Bi } from "@/components/bi";
import { biText } from "@/lib/lang";
import { useLang } from "@/lib/use-lang";

type Row = {
  userId: string;
  name: string;
  staffId: string | null;
  staffType: string | null;
  icPassport: string | null;
  payType: string | null;
  payRate: string | null;
  bankName: string | null;
  bankAccount: string | null;
  jobsCount: number;
  jobsPay: string;
  baseSalary: string;
  allowance: string;
  deduction: string;
  note: string;
  payrollId: string | null;
  payrollCode: string | null;
  status: "draft" | "paid" | null;
  issuedDate: string | null;
  periodType: string;
};

function nowStamp(): string {
  const my = new Date(Date.now() + 8 * 3600 * 1000);
  return my.toISOString().slice(0, 19).replace("T", " ");
}

type PeriodType = "Day" | "Week" | "Month" | "Custom";

export function PayrollBatchTable() {
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const today = todayISO();
  const [periodType, setPeriodType] = useState<PeriodType>("Month");
  const [from, setFrom] = useState(firstOfMonth(today));
  const [to, setTo] = useState(lastOfMonth(today));
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<React.ReactNode>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [search, setSearch] = useState("");

  const setPeriod = (type: PeriodType) => {
    setPeriodType(type);
    if (type === "Day") setTo(from);
    else if (type === "Week") setTo(addDays(from, 6));
    else if (type === "Month") {
      setFrom(firstOfMonth(from));
      setTo(lastOfMonth(from));
    }
  };

  const load = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/payroll/preview?periodStart=${from}&periodEnd=${to}`);
      if (!res.ok) {
        setError(<Bi zh="加载失败" en="Failed to load" />);
        return;
      }
      const data = await res.json();
      setRows(data.rows);
    });
  };

  // Refetches the preview table whenever the chosen period changes; the
  // setState itself only happens inside the fetch's resolved callback.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const filteredRows = useMemo(() => {
    if (!rows) return null;
    return rows.filter((r) => {
      if (selectedUserId && r.userId !== selectedUserId) return false;
      if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, selectedUserId, search]);

  const totals = useMemo(() => {
    if (!filteredRows) return { jobs: 0, net: 0 };
    return filteredRows.reduce(
      (acc, r) => ({
        jobs: acc.jobs + r.jobsCount,
        net: acc.net + Number(r.jobsPay) + Number(r.baseSalary) + Number(r.allowance) - Number(r.deduction),
      }),
      { jobs: 0, net: 0 },
    );
  }, [filteredRows]);

  const exportTsv = () => {
    const rows = filteredRows;
    if (!rows || rows.length === 0) return;
    const header = [
      "Name",
      "StaffType",
      "Jobs",
      "JobPay",
      "Base",
      "Allowance",
      "Deduction",
      "Net",
      "Bank",
      "Account",
      "Status",
    ];
    const lines = rows.map((r) => {
      const net = Number(r.jobsPay) + Number(r.baseSalary) + Number(r.allowance) - Number(r.deduction);
      return [
        r.name,
        r.staffType ?? "",
        r.jobsCount,
        r.jobsPay,
        r.baseSalary,
        r.allowance,
        r.deduction,
        net.toFixed(2),
        r.bankName ?? "",
        r.bankAccount ?? "",
        r.status ?? "draft",
      ].join("\t");
    });
    const tsv = [header.join("\t"), ...lines].join("\n");
    navigator.clipboard
      .writeText(tsv)
      .then(() => alert(biText("已复制，粘贴到 Excel 即可", "Copied — paste into Excel")))
      .catch(() => alert(tsv));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-neutral-200 p-4">
        <div className="flex flex-wrap gap-2 text-sm">
          {(["Day", "Week", "Month", "Custom"] as PeriodType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setPeriod(t)}
              className={
                periodType === t
                  ? "rounded-full bg-purple-700 hover:bg-purple-800 px-3 py-1 text-white"
                  : "rounded-full bg-neutral-100 px-3 py-1 text-neutral-700"
              }
            >
              {t}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="space-y-1 text-sm">
            <span className="text-xs text-neutral-500"><Bi zh="开始" en="From" /></span>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setPeriodType("Custom");
                setFrom(e.target.value);
              }}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-neutral-500"><Bi zh="结束" en="To" /></span>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setPeriodType("Custom");
                setTo(e.target.value);
              }}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
            />
          </label>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="space-y-1 text-sm">
            <span className="text-xs text-neutral-500"><Bi zh="员工" en="Employee" /></span>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
            >
              <option value="">全部 All employees</option>
              {rows?.map((r) => (
                <option key={r.userId} value={r.userId}>
                  {r.staffId ? `${r.staffId} · ` : ""}{r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-neutral-500"><Bi zh="搜索姓名" en="Search name" /></span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("输入姓名", "Type a name")}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
            />
          </label>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Badge labelZh="员工" labelEn="Staff" value={filteredRows?.length ?? "-"} />
          <Badge labelZh="任务" labelEn="Jobs" value={totals.jobs} />
          <Badge labelZh="净额合计" labelEn="Total net" value={formatMoney(totals.net)} />
          <button
            type="button"
            onClick={exportTsv}
            disabled={!filteredRows || filteredRows.length === 0}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
          >
            📋 <Bi zh="导出" en="Export" />
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {isPending && !rows ? (
        <p className="text-sm text-neutral-400">
          <Bi zh="加载中..." en="Loading..." />
        </p>
      ) : null}

      <div className="space-y-3">
        {filteredRows?.map((row) => (
          <PayrollRow
            key={`${row.userId}-${row.payrollId ?? "new"}-${row.status ?? "draft"}`}
            row={row}
            periodStart={from}
            periodEnd={to}
            onSaved={load}
          />
        ))}
      </div>
    </div>
  );
}

function Badge({
  labelZh,
  labelEn,
  value,
}: {
  labelZh: string;
  labelEn: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md bg-neutral-50 px-3 py-2 text-center">
      <p className="text-xs text-neutral-500">
        <Bi zh={labelZh} en={labelEn} />
      </p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function PayrollRow({
  row,
  periodStart,
  periodEnd,
  onSaved,
}: {
  row: Row;
  periodStart: string;
  periodEnd: string;
  onSaved: () => void;
}) {
  const [jobsCount, setJobsCount] = useState(String(row.jobsCount));
  const [jobsPay, setJobsPay] = useState(row.jobsPay);
  const [baseSalary, setBaseSalary] = useState(row.baseSalary);
  const [allowance, setAllowance] = useState(row.allowance);
  const [deduction, setDeduction] = useState(row.deduction);
  const [note, setNote] = useState(row.note);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<React.ReactNode>(null);
  const [showPreview, setShowPreview] = useState(false);

  const net =
    (Number(jobsPay) || 0) + (Number(baseSalary) || 0) + (Number(allowance) || 0) - (Number(deduction) || 0);
  const isPaid = row.status === "paid";

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/payroll/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: row.userId,
          periodStart,
          periodEnd,
          periodType: "custom",
          jobsCount,
          jobsPay,
          baseSalary,
          allowance,
          deduction,
          note,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : <Bi zh="保存失败" en="Failed to save" />);
        return;
      }
      setShowPreview(true);
      onSaved();
    });
  };

  const action = (path: "mark-paid" | "unpay") => {
    if (!row.payrollId) return;
    startTransition(async () => {
      await fetch(`/api/payroll/${row.payrollId}/${path}`, { method: "POST" });
      onSaved();
    });
  };

  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">
            {row.staffId ? <span className="text-xs font-normal text-neutral-400">{row.staffId}</span> : null}{" "}
            {row.name}
          </p>
          <p className="text-xs text-neutral-400">
            {row.staffType ?? "-"} · {row.payType === "base" ? "Monthly" : "PerJob"}
            {row.payrollCode ? ` · ${row.payrollCode}` : ""}
          </p>
        </div>
        {row.status ? (
          <span
            className={
              isPaid
                ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
            }
          >
            <Bi zh={isPaid ? "已发放" : "草稿"} en={isPaid ? "Paid" : "Draft"} />
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Field labelZh="任务数" labelEn="Jobs" value={jobsCount} onChange={setJobsCount} disabled={isPaid} type="number" />
        <Field labelZh="任务工资" labelEn="Job pay" value={jobsPay} onChange={setJobsPay} disabled={isPaid} type="number" />
        <Field labelZh="底薪" labelEn="Base" value={baseSalary} onChange={setBaseSalary} disabled={isPaid} type="number" />
        <Field labelZh="津贴" labelEn="Allowance" value={allowance} onChange={setAllowance} disabled={isPaid} type="number" />
        <Field labelZh="扣款" labelEn="Deduction" value={deduction} onChange={setDeduction} disabled={isPaid} type="number" />
        <Field labelZh="备注" labelEn="Note" value={note} onChange={setNote} disabled={isPaid} />
      </div>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      <div className="mt-3 flex items-center justify-between">
        <p className="font-semibold">
          <Bi zh="净额" en="Net" />: {formatMoney(net)}
        </p>
        <div className="flex flex-wrap gap-2">
          {!isPaid ? (
            <button
              type="button"
              disabled={isPending}
              onClick={save}
              className="rounded-md bg-purple-700 hover:bg-purple-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              <Bi zh="保存" en="Save" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setShowPreview((v) => !v)}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
          >
            {showPreview ? <Bi zh="隐藏预览" en="Hide preview" /> : <Bi zh="预览" en="Preview" />}
          </button>
          {row.payrollId ? (
            <>
              <Link
                href={`/payroll/${row.payrollId}`}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
              >
                <Bi zh="详情" en="Detail" />
              </Link>
              {isPaid ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (confirm(biText("撤销已发放状态？", "Revert this payslip to draft?"))) action("unpay");
                  }}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
                >
                  <Bi zh="撤销" en="Unpay" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => action("mark-paid")}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                >
                  <Bi zh="标记已发放" en="Mark paid" />
                </button>
              )}
            </>
          ) : null}
        </div>
      </div>

      {showPreview ? (
        <div className="mt-4">
          <PayslipView
            data={{
              payrollCode: row.payrollCode ?? "DRAFT",
              employeeName: row.name,
              staffId: row.staffId,
              staffType: row.staffType,
              icPassport: row.icPassport,
              bankName: row.bankName,
              bankAccount: row.bankAccount,
              periodStart,
              periodEnd,
              periodType: row.periodType,
              issuedDate: row.issuedDate ?? todayISO(),
              jobsCount: Number(jobsCount) || 0,
              jobsPay,
              baseSalary,
              allowance,
              deduction,
              note,
              status: isPaid ? "paid" : "draft",
              paidAt: null,
              generatedAt: nowStamp(),
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function Field({
  labelZh,
  labelEn,
  value,
  onChange,
  disabled,
  type = "text",
}: {
  labelZh: string;
  labelEn: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <label className="space-y-1 text-xs">
      <span className="text-neutral-500">
        <Bi zh={labelZh} en={labelEn} />
      </span>
      <input
        type={type}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm disabled:bg-neutral-50"
      />
    </label>
  );
}
