import { auth } from "@/auth";
import { DashboardNav } from "@/components/dashboard-nav";
import { signOutAction } from "./actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session!.user;

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-purple-100 bg-purple-50/40 p-4 sm:flex">
        <div className="mb-6">
          <p className="text-sm font-semibold text-purple-900">Bliss Rooms</p>
          <p className="text-xs text-neutral-500">Job System</p>
        </div>
        <DashboardNav role={user.role} />
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between bg-purple-900 px-4 py-3 sm:px-6">
          <div className="sm:hidden">
            <p className="text-sm font-semibold text-white">Bliss Rooms</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-purple-100">
              {user.name} · <span className="uppercase">{user.role}</span>
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-md border border-purple-600 px-3 py-1.5 text-sm text-white hover:bg-purple-800"
              >
                登出 Sign out
              </button>
            </form>
          </div>
        </header>
        <div className="border-b border-purple-100 bg-purple-50/40 px-4 py-2 sm:hidden">
          <DashboardNav role={user.role} orientation="horizontal" />
        </div>
        {user.mustChangePassword ? (
          <a
            href="/account"
            className="block bg-amber-50 px-4 py-2 text-center text-sm text-amber-800 hover:bg-amber-100 sm:px-6"
          >
            请先修改初始密码 Please change your temporary password →
          </a>
        ) : null}
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
