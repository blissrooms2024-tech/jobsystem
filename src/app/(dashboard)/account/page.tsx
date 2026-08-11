import { auth } from "@/auth";
import { ChangePasswordForm } from "@/components/change-password-form";

export default async function AccountPage() {
  const session = await auth();
  const user = session!.user;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">我的账号 My account</h1>
        <p className="text-sm text-neutral-500">{user.name} · {user.username}</p>
      </div>
      {user.mustChangePassword ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          请先修改初始密码 Please change your temporary password.
        </p>
      ) : null}
      <ChangePasswordForm />
    </div>
  );
}
