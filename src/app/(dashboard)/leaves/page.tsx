import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { leaves, users } from "@/db/schema";
import { LeavesListClient } from "@/components/leaves-list-client";
import { Bi } from "@/components/bi";

export default async function LeavesPage() {
  const session = await auth();
  const user = session!.user;
  const isAdmin = ["boss", "admin", "supervisor"].includes(user.role);

  let scope;
  if (!isAdmin) {
    scope = eq(leaves.userId, user.id);
  } else if (user.role === "supervisor") {
    const subordinates = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.supervisorId, user.id));
    scope = inArray(
      leaves.userId,
      subordinates.map((s) => s.id),
    );
  }

  const rows = await db
    .select({
      id: leaves.id,
      leaveCode: leaves.leaveCode,
      type: leaves.type,
      startDate: leaves.startDate,
      endDate: leaves.endDate,
      days: leaves.days,
      status: leaves.status,
      employeeName: users.name,
      employeeStaffId: users.staffId,
      employeeUserCode: users.userCode,
    })
    .from(leaves)
    .innerJoin(users, eq(leaves.userId, users.id))
    .where(scope)
    .orderBy(desc(leaves.createdAt), users.staffId, users.userCode)
    .limit(200);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          <Bi zh="请假" en="Leaves" />
        </h1>
        <Link
          href="/leaves/new"
          className="rounded-md bg-purple-700 hover:bg-purple-800 px-3 py-2 text-sm font-medium text-white"
        >
          + <Bi zh="申请请假" en="Request leave" />
        </Link>
      </div>

      <LeavesListClient rows={rows} isAdmin={isAdmin} />
    </div>
  );
}
