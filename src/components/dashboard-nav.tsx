"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Role } from "@/types/next-auth";

type NavItem = {
  href: string;
  label: string;
  roles?: Role[];
};

const ADMIN_ROLES: Role[] = ["boss", "admin", "supervisor"];

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "总览 Dashboard" },
  { href: "/jobs", label: "任务 Jobs" },
  { href: "/jobs/calendar", label: "日历 Calendar" },
  { href: "/payroll", label: "工资 Payroll", roles: ["boss", "admin"] },
  { href: "/payroll/me", label: "我的工资 My Payslips", roles: ["employee", "supervisor"] },
  { href: "/leaves", label: "请假 Leaves" },
  { href: "/users", label: "员工 Users", roles: ADMIN_ROLES },
  { href: "/units", label: "单位 Units", roles: ADMIN_ROLES },
  { href: "/job-types", label: "工种 Job Types", roles: ADMIN_ROLES },
  { href: "/account", label: "我的账号 Account" },
];

export function DashboardNav({ role }: { role: Role }) {
  const pathname = usePathname();
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
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-purple-700 text-white hover:bg-purple-800"
                : "text-neutral-700 hover:bg-purple-100/70 hover:text-purple-900",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
