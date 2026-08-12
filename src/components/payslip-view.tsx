import { formatMoney } from "@/lib/utils";
import { amountInWords } from "@/lib/amount-words";
import type { PayslipData } from "@/lib/payslip-pdf";

const COMPANY = {
  name: "BLISS ROOMS ENTERPRISE",
  reg: "No. Pendaftaran: 202403031665 (003573307-U)",
  address: "5635, Lahar Tiang, 13200 Kepala Batas, Pulau Pinang",
  contact: "Tel: 011-3654 7863 / 012-439 2491 · blissrooms2024@gmail.com",
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex text-sm">
      <span className="w-28 shrink-0 text-neutral-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

/** Styled HTML rendition of the payslip PDF — for viewing in-app without opening a PDF file. */
export function PayslipView({ data }: { data: PayslipData }) {
  const net =
    Number(data.jobsPay) + Number(data.baseSalary) + Number(data.allowance) - Number(data.deduction);
  const gross = Number(data.jobsPay) + Number(data.baseSalary) + Number(data.allowance);
  const periodTypeLabel = data.periodType === "month" ? "Month" : "Custom";

  return (
    <div className="rounded-lg border border-neutral-200 p-6">
      <div className="mb-4 border-b-2 border-neutral-800 pb-3 text-center">
        <p className="text-lg font-bold tracking-wide">{COMPANY.name}</p>
        <p className="text-xs text-neutral-500">{COMPANY.reg}</p>
        <p className="text-xs text-neutral-500">{COMPANY.address}</p>
        <p className="text-xs text-neutral-500">{COMPANY.contact}</p>
      </div>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <p className="text-base font-bold">PAYSLIP</p>
        <div className="text-right text-xs text-neutral-600">
          <p>
            Pay period: <span className="font-medium">{data.periodStart} – {data.periodEnd}</span>
          </p>
          <p>
            Type: {periodTypeLabel} &nbsp; Issued: {data.issuedDate}
          </p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
        <InfoRow label="Name" value={data.employeeName} />
        <InfoRow label="Position" value={data.staffType ?? "-"} />
        <InfoRow label="Staff ID" value={data.staffId ?? "-"} />
        <InfoRow label="IC / Passport" value={data.icPassport ?? "-"} />
        <InfoRow label="Bank" value={data.bankName ?? "-"} />
        <InfoRow label="Account No." value={data.bankAccount ?? "-"} />
      </div>

      <div className="grid grid-cols-1 overflow-hidden rounded-md border border-neutral-300 sm:grid-cols-2">
        <div className="border-b border-neutral-300 sm:border-b-0 sm:border-r">
          <div className="flex justify-between bg-neutral-100 px-3 py-1.5 text-xs font-semibold">
            <span>Earnings</span>
            <span>RM</span>
          </div>
          <div className="flex justify-between border-b border-neutral-100 px-3 py-1.5 text-sm">
            <span>Job pay ({data.jobsCount} jobs)</span>
            <span>{formatMoney(data.jobsPay)}</span>
          </div>
          <div className="flex justify-between border-b border-neutral-100 px-3 py-1.5 text-sm">
            <span>Basic salary</span>
            <span>{formatMoney(data.baseSalary)}</span>
          </div>
          <div className="flex justify-between border-b border-neutral-100 px-3 py-1.5 text-sm">
            <span>Allowance</span>
            <span>{formatMoney(data.allowance)}</span>
          </div>
          <div className="flex justify-between bg-neutral-50 px-3 py-1.5 text-sm font-semibold">
            <span>Gross Earnings</span>
            <span>{formatMoney(gross)}</span>
          </div>
        </div>
        <div>
          <div className="flex justify-between bg-neutral-100 px-3 py-1.5 text-xs font-semibold">
            <span>Deductions</span>
            <span>RM</span>
          </div>
          <div className="flex justify-between border-b border-neutral-100 px-3 py-1.5 text-sm">
            <span>Deduction</span>
            <span>{formatMoney(data.deduction)}</span>
          </div>
          <div className="px-3 py-1.5 text-sm">&nbsp;</div>
          <div className="px-3 py-1.5 text-sm">&nbsp;</div>
          <div className="flex justify-between bg-neutral-50 px-3 py-1.5 text-sm font-semibold">
            <span>Total Deductions</span>
            <span>{formatMoney(data.deduction)}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-between">
        <span className="text-base font-bold text-neutral-400">NET PAY</span>
        <span className="text-base font-bold text-neutral-400">{formatMoney(net)}</span>
      </div>
      <p className="mt-1 text-xs italic text-neutral-600">{amountInWords(net)}</p>

      <div className="mt-2 flex items-center gap-1.5 text-xs">
        <span>Payment:</span>
        <span className="rounded-full border border-neutral-400 px-2 py-0.5">
          {data.status === "paid" ? "PAID" : "DRAFT"}
        </span>
      </div>

      {data.note ? (
        <div className="mt-4">
          <p className="text-sm text-neutral-500">Remarks</p>
          <p className="text-sm">{data.note}</p>
        </div>
      ) : null}

      <div className="mt-8 border-t border-neutral-300 pt-3">
        <div className="flex justify-between text-xs text-neutral-500">
          <div>
            <p>Authorised by (Employer)</p>
            <p className="font-semibold">{COMPANY.name}</p>
          </div>
          <div className="text-right">
            <p>Received by (Employee)</p>
            <p className="font-semibold">{data.employeeName}</p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-[10px] text-neutral-400">
        This is a computer-generated payslip. Generated on {data.generatedAt}.
      </p>
    </div>
  );
}
