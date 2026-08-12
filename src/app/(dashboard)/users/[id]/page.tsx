import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { UserProfileForm } from "@/components/user-profile-form";
import { Bi } from "@/components/bi";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!["boss", "admin"].includes(session!.user.role)) notFound();

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
          <Bi zh={user.active ? "在职" : "停用"} en={user.active ? "Active" : "Inactive"} />
        </p>
      </div>

      {canEdit ? (
        <UserProfileForm
          userId={user.id}
          name={user.name}
          staffId={user.staffId}
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
          <Field labelZh="员工编号" labelEn="Staff ID" value={user.staffId} />
          <Field labelZh="电话" labelEn="Phone" value={user.phone} />
          <Field labelZh="类型" labelEn="Staff type" value={user.staffType} />
          <Field labelZh="IC / 护照" labelEn="IC / Passport" value={user.icPassport} />
          <Field labelZh="邮箱" labelEn="Email" value={user.email} />
          <Field labelZh="地址" labelEn="Address" value={user.address} full />
          <Field labelZh="紧急联系人" labelEn="Emergency" value={user.emergencyContact} full />
          <Field labelZh="银行" labelEn="Bank" value={user.bankName} />
          <Field labelZh="银行账号" labelEn="Account" value={user.bankAccount} />
        </dl>
      )}
    </div>
  );
}

function Field({
  labelZh,
  labelEn,
  value,
  full,
}: {
  labelZh: string;
  labelEn: string;
  value: string | null;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : undefined}>
      <dt className="text-xs text-neutral-400">
        <Bi zh={labelZh} en={labelEn} />
      </dt>
      <dd className="font-medium">{value || "-"}</dd>
    </div>
  );
}
