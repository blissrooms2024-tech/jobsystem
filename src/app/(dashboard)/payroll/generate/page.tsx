import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { GeneratePayrollForm } from "@/components/generate-payroll-form";

export default async function GeneratePayrollPage() {
  const employeeRows = await db.select().from(users).where(eq(users.active, true));

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">生成工资单 Generate payslip</h1>
      <GeneratePayrollForm
        employees={employeeRows
          .filter((u) => u.role !== "boss")
          .map((u) => ({ id: u.id, label: u.name }))}
      />
    </div>
  );
}
