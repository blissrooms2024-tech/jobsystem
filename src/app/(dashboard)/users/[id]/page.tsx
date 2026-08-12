import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { UserProfileForm } from "@/components/user-profile-form";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!["boss", "admin", "supervisor"].includes(session!.user.role)) notFound();

  const { id } = await params;
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!user) notFound();

  const canEdit = session!.user.role === "boss" || session!.user.role === "admin";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-neutral-400">{user.userCode}</p>
        <h1 className="text-lg font-semibold">{user.name}</h1>
        <p className="text-sm text-neutral-500">
          {user.username} · <span className="capitalize">{user.role}</span> ·{" "}
          {user.active ? "在职 Active" : "停用 Inactive"}
        </p>
      </div>

      {canEdit ? (
        <UserProfileForm
          userId={user.id}
          name={user.name}
          phone={user.phone}
          staffType={user.staffType}
          icPassport={user.icPassport}
          address={user.address}
          email={user.email}
          emergencyContact={user.emergencyContact}
          bankName={user.bankName}
          bankAccount={user.bankAccount}
          payRate={user.payRate}
          needCheckin={user.needCheckin}
          donePhotos={user.donePhotos}
        />
      ) : (
        <dl className="grid max-w-2xl grid-cols-2 gap-3 text-sm">
          <Field label="电话 Phone" value={user.phone} />
          <Field label="类型 Staff type" value={user.staffType} />
          <Field label="IC / 护照" value={user.icPassport} />
          <Field label="邮箱 Email" value={user.email} />
          <Field label="地址 Address" value={user.address} full />
          <Field label="紧急联系人 Emergency" value={user.emergencyContact} full />
          <Field label="银行 Bank" value={user.bankName} />
          <Field label="银行账号 Account" value={user.bankAccount} />
        </dl>
      )}
    </div>
  );
}

function Field({ label, value, full }: { label: string; value: string | null; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : undefined}>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="font-medium">{value || "-"}</dd>
    </div>
  );
}
