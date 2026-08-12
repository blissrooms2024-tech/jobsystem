"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Bi } from "@/components/bi";
import { useUnreadCount } from "@/lib/use-unread";
import type { Role } from "@/types/next-auth";

type NavItem = {
  href: string;
  zh: string;
  en: string;
  roles?: Role[];
};

const ADMIN_ROLES: Role[] = ["boss", "admin"];

const NAV_ITEMS: NavItem[] = [
  { href: "/", zh: "总览", en: "Dashboard" },
  { href: "/jobs", zh: "任务", en: "Jobs" },
  { href: "/jobs/calendar", zh: "日历", en: "Calendar" },
  { href: "/payroll", zh: "工资", en: "Payroll", roles: ["boss", "admin"] },
  { href: "/payroll/me", zh: "我的工资", en: "My Payslips", roles: ["employee", "supervisor"] },
  { href: "/leaves", zh: "请假", en: "Leaves" },
  { href: "/chat", zh: "聊天", en: "Chat" },
  { href: "/team", zh: "我的下属", en: "My Team", roles: ["supervisor"] },
  { href: "/users", zh: "员工", en: "Users", roles: ADMIN_ROLES },
  { href: "/units", zh: "单位", en: "Units", roles: ADMIN_ROLES },
  { href: "/job-types", zh: "工种", en: "Job Types", roles: ADMIN_ROLES },
  { href: "/account", zh: "我的账号", en: "Account" },
];

export function DashboardNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const unread = useUnreadCount();
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-purple-700 text-white hover:bg-purple-800"
                : "text-neutral-700 hover:bg-purple-100/70 hover:text-purple-900",
            )}
          >
            <Bi zh={item.zh} en={item.en} />
            {item.href === "/chat" && unread > 0 ? (
              <span className="ml-2 rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
