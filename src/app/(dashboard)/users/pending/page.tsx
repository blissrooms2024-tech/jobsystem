import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { PendingSignupRow } from "@/components/pending-signup-row";
import { Bi } from "@/components/bi";

export default async function PendingSignupsPage() {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.pendingApproval, true))
    .orderBy(users.userCode);

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-lg font-semibold">
        <Bi zh="待批准的注册申请" en="Pending signup requests" />
      </h1>

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-400">
          <Bi zh="暂无待批准的申请" en="No pending signup requests" />
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((u) => (
            <PendingSignupRow
              key={u.id}
              id={u.id}
              name={u.name}
              username={u.username}
              email={u.email}
              phone={u.phone}
              icPassport={u.icPassport}
              address={u.address}
              emergencyContact={u.emergencyContact}
              bankName={u.bankName}
              bankAccount={u.bankAccount}
            />
          ))}
        </div>
      )}
    </div>
  );
}
