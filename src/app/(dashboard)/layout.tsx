import { auth } from "@/auth";
import { DashboardNav } from "@/components/dashboard-nav";
import { MobileNav } from "@/components/mobile-nav";
import { LanguageToggle } from "@/components/language-toggle";
import { PresenceHeartbeat } from "@/components/presence-heartbeat";
import { ChatNotifier } from "@/components/chat-notifier";
import { Bi } from "@/components/bi";
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
      <PresenceHeartbeat />
      <ChatNotifier />
      <aside className="hidden w-56 shrink-0 flex-col border-r border-purple-100 bg-purple-50/40 p-4 sm:flex">
        <div className="mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG in /public, no Image optimization needed */}
          <img src="/logo.svg" alt="Bliss Rooms Properties Management" className="w-full" />
          <p className="mt-1 text-center text-xs text-neutral-500">
            <Bi zh="任务系统" en="Job System" />
          </p>
        </div>
        <DashboardNav role={user.role} />
      </aside>
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between bg-white px-4 py-3 sm:bg-purple-900 sm:px-6">
          <MobileNav role={user.role} />
          <div className="ml-auto flex items-center gap-3">
            <LanguageToggle />
            <span className="text-sm text-neutral-600 sm:text-purple-100">
              {user.name} · <span className="uppercase">{user.role}</span>
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 sm:border-purple-600 sm:text-white sm:hover:bg-purple-800"
              >
                <Bi zh="登出" en="Sign out" />
              </button>
            </form>
          </div>
        </header>
        {user.mustChangePassword ? (
          <a
            href="/account"
            className="block bg-amber-50 px-4 py-2 text-center text-sm text-amber-800 hover:bg-amber-100 sm:px-6"
          >
            <Bi zh="请先修改初始密码" en="Please change your temporary password" /> →
          </a>
        ) : null}
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
