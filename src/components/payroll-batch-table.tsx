"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/utils";
import { addDays, firstOfMonth, lastOfMonth, todayISO } from "@/lib/pay-periods";

type Row = {
  userId: string;
  name: string;
  staffType: string | null;
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
};

type PeriodType = "Day" | "Week" | "Month" | "Custom";

export function PayrollBatchTable() {
  const today = todayISO();
  const [periodType, setPeriodType] = useState<PeriodType>("Month");
  const [from, setFrom] = useState(firstOfMonth(today));
  const [to, setTo] = useState(lastOfMonth(today));
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
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
        setError("加载失败 Failed to load");
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
      .then(() => alert("已复制，粘贴到 Excel 即可 Copied — paste into Excel"))
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
                  ? "rounded-full bg-neutral-900 px-3 py-1 text-white"
                  : "rounded-full bg-neutral-100 px-3 py-1 text-neutral-700"
              }
            >
              {t}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="space-y-1 text-sm">
            <span className="text-xs text-neutral-500">开始 From</span>
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
            <span className="text-xs text-neutral-500">结束 To</span>
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
            <span className="text-xs text-neutral-500">员工 Employee</span>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
            >
              <option value="">全部 All employees</option>
              {rows?.map((r) => (
                <option key={r.userId} value={r.userId}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-neutral-500">搜索姓名 Search name</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="输入姓名 Type a name"
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5"
            />
          </label>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Badge label="员工 Staff" value={filteredRows?.length ?? "-"} />
          <Badge label="任务 Jobs" value={totals.jobs} />
          <Badge label="净额合计 Total net" value={formatMoney(totals.net)} />
          <button
            type="button"
            onClick={exportTsv}
            disabled={!filteredRows || filteredRows.length === 0}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
          >
            📋 导出 Export
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {isPending && !rows ? <p className="text-sm text-neutral-400">加载中... Loading...</p> : null}

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

function Badge({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-neutral-50 px-3 py-2 text-center">
      <p className="text-xs text-neutral-500">{label}</p>
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
  const [error, setError] = useState<string | null>(null);

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
        setError(typeof data.error === "string" ? data.error : "保存失败 Failed to save");
        return;
      }
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
          <p className="font-medium">{row.name}</p>
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
            {isPaid ? "已发放 Paid" : "草稿 Draft"}
          </span>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Field label="任务数 Jobs" value={jobsCount} onChange={setJobsCount} disabled={isPaid} type="number" />
        <Field label="任务工资 Job pay" value={jobsPay} onChange={setJobsPay} disabled={isPaid} type="number" />
        <Field label="底薪 Base" value={baseSalary} onChange={setBaseSalary} disabled={isPaid} type="number" />
        <Field label="津贴 Allowance" value={allowance} onChange={setAllowance} disabled={isPaid} type="number" />
        <Field label="扣款 Deduction" value={deduction} onChange={setDeduction} disabled={isPaid} type="number" />
        <Field label="备注 Note" value={note} onChange={setNote} disabled={isPaid} />
      </div>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      <div className="mt-3 flex items-center justify-between">
        <p className="font-semibold">净额 Net: {formatMoney(net)}</p>
        <div className="flex flex-wrap gap-2">
          {!isPaid ? (
            <button
              type="button"
              disabled={isPending}
              onClick={save}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              保存 Save
            </button>
          ) : null}
          {row.payrollId ? (
            <>
              <Link
                href={`/payroll/${row.payrollId}`}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
              >
                详情 Detail
              </Link>
              {isPaid ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    if (confirm("撤销已发放状态？\nRevert this payslip to draft?")) action("unpay");
                  }}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50"
                >
                  撤销 Unpay
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => action("mark-paid")}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
                >
                  标记已发放 Mark paid
                </button>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <label className="space-y-1 text-xs">
      <span className="text-neutral-500">{label}</span>
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
