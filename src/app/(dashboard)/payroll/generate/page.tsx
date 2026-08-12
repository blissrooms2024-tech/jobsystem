import { PayrollBatchTable } from "@/components/payroll-batch-table";

export default function PayrollBatchPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">工资结算 Payroll</h1>
      <p className="text-sm text-neutral-500">
        选择周期，系统会列出所有在职员工，自动算好任务工资，你可以直接调整后逐个保存。
        <br />
        Pick a period — every active staff member shows up with their job pay pre-filled; adjust and save per row.
      </p>
      <PayrollBatchTable />
    </div>
  );
}
