import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { UsersPageClient } from "@/components/users-page-client";
import { Bi } from "@/components/bi";

export default async function UsersPage() {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.pendingApproval, false))
    .orderBy(users.staffId, users.userCode);

  const [{ value: pendingCount }] = await db
    .select({ value: count() })
    .from(users)
    .where(eq(users.pendingApproval, true));

  return (
    <div className="space-y-4">
      {pendingCount > 0 ? (
        <Link
          href="/users/pending"
          className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 hover:bg-amber-100"
        >
          <span>
            <Bi zh="有" en="There " />
            <strong>{pendingCount}</strong>
            <Bi zh="个新员工注册申请待批准" en={pendingCount === 1 ? " new signup pending approval" : " new signups pending approval"} />
          </span>
          <span className="underline">
            <Bi zh="去看看" en="Review" />
          </span>
        </Link>
      ) : null}
      <UsersPageClient rows={rows} />
    </div>
  );
}
