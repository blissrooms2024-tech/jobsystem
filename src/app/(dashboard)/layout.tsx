import { headers } from "next/headers";
import { and, eq, lte, or, gte, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { notices, users } from "@/db/schema";
import { myToday } from "@/lib/job-timing";
import { DashboardNav } from "@/components/dashboard-nav";
import { MobileNav } from "@/components/mobile-nav";
import { LanguageToggle } from "@/components/language-toggle";
import { PresenceHeartbeat } from "@/components/presence-heartbeat";
import { ChatNotifier } from "@/components/chat-notifier";
import { ChatWidget } from "@/components/chat-widget";
import { NoticePopup } from "@/components/notice-popup";
import { MyProfileForm } from "@/components/my-profile-form";
import { Bi } from "@/components/bi";
import { signOutAction } from "./actions";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session!.user;

  const [me] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const profileComplete = !!(
    me?.phone &&
    me?.icPassport &&
    me?.address &&
    me?.emergencyContact &&
    me?.bankName &&
    me?.bankAccount
  );
  const hdrs = await headers();
  const onAccountPage = hdrs.get("x-pathname") === "/account";
  // Boss/admin accounts predate this gate and run the system for everyone
  // else — never lock them out of their own dashboard over a missing bank
  // account field. This is aimed at onboarding new staff.
  const gateApplies = user.role === "employee" || user.role === "supervisor";
  const blockForIncompleteProfile = gateApplies && !profileComplete && !onAccountPage;

  const today = myToday();
  const activeNotices = await db
    .select()
    .from(notices)
    .where(
      and(
        eq(notices.active, true),
        or(isNull(notices.startDate), lte(notices.startDate, today)),
        or(isNull(notices.endDate), gte(notices.endDate, today)),
      ),
    );

  return (
    <div className="flex min-h-screen">
      <PresenceHeartbeat />
      <ChatNotifier />
      <ChatWidget currentUserId={user.id} />
      <NoticePopup notices={activeNotices.map((n) => ({ id: n.id, title: n.title, content: n.content }))} />
      <aside className="hidden w-56 shrink-0 flex-col border-r border-purple-100 bg-purple-50/40 p-4 sm:flex">
        <div className="mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG in /public, no Image optimization needed */}
          <img src="/logo.svg" alt="Bliss Rooms Properties Management" className="w-full" />
          <p className="mt-1 text-center text-xs text-neutral-500">
            <Bi zh="任务系统" en="Job System" />
          </p>
        </div>
        <DashboardNav role={user.role} />
        <p className="mt-auto pt-4 text-center text-xs text-neutral-400">
          © {new Date().getFullYear()} Bliss Rooms
        </p>
      </aside>
      {/* min-w-0 is required here — without it, a flex child containing a
          wide element (like a table with min-w-[...]) forces this whole
          column wider than the viewport instead of scrolling internally,
          pushing the sidebar/page off to the side. */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
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
        {/* Extra bottom padding on desktop so the floating chat launcher
            (fixed bottom-right) never sits on top of the last row's action
            buttons in a long table. */}
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 pb-6 sm:p-6 sm:pb-24">
          {blockForIncompleteProfile ? (
            <div className="max-w-2xl space-y-4">
              <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <Bi
                  zh="请先填完以下资料才能使用系统其他功能。"
                  en="Please complete the details below before using the rest of the system."
                />
              </div>
              <h1 className="text-lg font-semibold">
                <Bi zh="我的资料" en="My details" />
              </h1>
              <MyProfileForm
                phone={me?.phone ?? null}
                icPassport={me?.icPassport ?? null}
                address={me?.address ?? null}
                email={me?.email ?? null}
                emergencyContact={me?.emergencyContact ?? null}
                bankName={me?.bankName ?? null}
                bankAccount={me?.bankAccount ?? null}
                staffType={me?.staffType ?? null}
                fbProfileLink={me?.fbProfileLink ?? null}
                requireCore
              />
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
