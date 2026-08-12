import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ChangePasswordForm } from "@/components/change-password-form";
import { MyProfileForm } from "@/components/my-profile-form";

export default async function AccountPage() {
  const session = await auth();
  const user = session!.user;

  const [me] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold">我的账号 My account</h1>
        <p className="text-sm text-neutral-500">{user.name} · {user.username}</p>
      </div>
      {user.mustChangePassword ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          请先修改初始密码 Please change your temporary password.
        </p>
      ) : null}

      {me ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">我的资料 My details</h2>
          <MyProfileForm
            phone={me.phone}
            icPassport={me.icPassport}
            address={me.address}
            email={me.email}
            emergencyContact={me.emergencyContact}
            bankName={me.bankName}
            bankAccount={me.bankAccount}
          />
        </div>
      ) : null}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">修改密码 Change password</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
