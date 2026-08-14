import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ChangePasswordForm } from "@/components/change-password-form";
import { MyProfileForm } from "@/components/my-profile-form";
import { Bi } from "@/components/bi";

export default async function AccountPage() {
  const session = await auth();
  const user = session!.user;

  const [me] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold">
          <Bi zh="我的账号" en="My account" />
        </h1>
        <p className="text-sm text-neutral-500">{user.name} · {user.username}</p>
      </div>
      {user.mustChangePassword ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <Bi zh="请先修改初始密码" en="Please change your temporary password." />
        </p>
      ) : null}

      {me ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">
            <Bi zh="我的资料" en="My details" />
          </h2>
          <MyProfileForm
            phone={me.phone}
            icPassport={me.icPassport}
            address={me.address}
            email={me.email}
            emergencyContact={me.emergencyContact}
            bankName={me.bankName}
            bankAccount={me.bankAccount}
            staffType={me.staffType}
            fbProfileLink={me.fbProfileLink}
          />
        </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">
          <Bi zh="修改密码" en="Change password" />
        </h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
