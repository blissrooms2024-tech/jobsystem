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
      <span className="w-32 shrink-0 text-neutral-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function AmountRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className={muted ? "text-neutral-500" : undefined}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

/** Styled HTML rendition of the payslip PDF — for viewing in-app without opening a PDF file. */
export function PayslipView({ data }: { data: PayslipData }) {
  const net =
    Number(data.jobsPay) + Number(data.baseSalary) + Number(data.allowance) - Number(data.deduction);
  const gross = Number(data.jobsPay) + Number(data.baseSalary) + Number(data.allowance);

  return (
    <div className="rounded-lg border border-neutral-200 p-6">
      <div className="mb-4 border-b-2 border-neutral-800 pb-3 text-center">
        <p className="text-lg font-bold tracking-wide">{COMPANY.name}</p>
        <p className="text-xs text-neutral-500">{COMPANY.reg}</p>
        <p className="text-xs text-neutral-500">{COMPANY.address}</p>
        <p className="text-xs text-neutral-500">{COMPANY.contact}</p>
      </div>

      <p className="text-base font-bold">PAYSLIP</p>
      <p className="mb-3 text-sm text-neutral-500">
        {data.payrollCode} · {data.periodStart} to {data.periodEnd}
      </p>

      <div className="space-y-1">
        <InfoRow label="Name" value={data.employeeName} />
        <InfoRow label="Position" value={data.staffType ?? "-"} />
        <InfoRow label="IC / Passport" value={data.icPassport ?? "-"} />
        <InfoRow
          label="Bank"
          value={`${data.bankName ?? "-"}${data.bankAccount ? ` · ${data.bankAccount}` : ""}`}
        />
      </div>

      <div className="my-4 border-t border-neutral-200" />

      <div>
        <AmountRow label={`Jobs pay (${data.jobsCount} jobs)`} value={formatMoney(data.jobsPay)} muted />
        <AmountRow label="Base salary" value={formatMoney(data.baseSalary)} muted />
        <AmountRow label="Allowance" value={formatMoney(data.allowance)} muted />
        <AmountRow label="Gross earnings" value={formatMoney(gross)} muted />
        <AmountRow label="Deduction" value={`-${formatMoney(data.deduction)}`} muted />
      </div>

      <div className="mt-3 flex justify-between rounded-md bg-neutral-900 px-4 py-3">
        <span className="text-base font-bold text-white">NET PAY</span>
        <span className="text-base font-bold text-white">{formatMoney(net)}</span>
      </div>
      <p className="mt-2 text-xs italic text-neutral-600">{amountInWords(net)}</p>

      {data.note ? (
        <div className="mt-4">
          <p className="text-sm text-neutral-500">Remarks</p>
          <p className="text-sm">{data.note}</p>
        </div>
      ) : null}

      <p className="mt-3 text-xs text-neutral-400">
        {data.paidAt ? `Paid on ${data.paidAt}` : "Draft — not yet paid"}
      </p>

      <div className="mt-12 flex gap-8 text-xs text-neutral-500">
        <div className="w-1/2 border-t border-neutral-300 pt-1">
          Authorised by (Employer)
          <br />
          {COMPANY.name}
        </div>
        <div className="w-1/2 border-t border-neutral-300 pt-1">
          Received by (Employee)
          <br />
          {data.employeeName}
          {data.icPassport ? (
            <>
              <br />
              IC / Passport: {data.icPassport}
            </>
          ) : null}
        </div>
      </div>

      <p className="mt-6 text-center text-[10px] text-neutral-400">This is a computer-generated payslip.</p>
    </div>
  );
}
