import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { payroll } from "@/db/schema";
import { Bi } from "@/components/bi";
import { MyPayslipsClient } from "@/components/my-payslips-client";

export default async function MyPayrollPage() {
  const session = await auth();
  const userId = session!.user.id;

  const rows = await db
    .select()
    .from(payroll)
    .where(eq(payroll.userId, userId))
    .orderBy(desc(payroll.createdAt))
    .limit(100);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">
        <Bi zh="我的工资单" en="My payslips" />
      </h1>
      <MyPayslipsClient rows={rows} />
    </div>
  );
}
