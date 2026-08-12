import { PayrollBatchTable } from "@/components/payroll-batch-table";
import { Bi } from "@/components/bi";

export default function PayrollBatchPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">
        <Bi zh="工资结算" en="Payroll" />
      </h1>
      <p className="text-sm text-neutral-500">
        <Bi
          zh="选择周期，系统会列出所有在职员工，自动算好任务工资，你可以直接调整后逐个保存。"
          en="Pick a period — every active staff member shows up with their job pay pre-filled; adjust and save per row."
        />
      </p>
      <PayrollBatchTable />
    </div>
  );
}
