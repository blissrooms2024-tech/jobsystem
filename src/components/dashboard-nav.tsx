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
  { href: "/payroll", label: "工资 Payroll", roles: ["boss", "admin"] },
  { href: "/payroll/me", label: "我的工资 My Payslips", roles: ["employee", "supervisor"] },
  { href: "/leaves", label: "请假 Leaves" },
  { href: "/users", label: "员工 Users", roles: ADMIN_ROLES },
  { href: "/units", label: "单位 Units", roles: ADMIN_ROLES },
  { href: "/job-types", label: "工种 Job Types", roles: ADMIN_ROLES },
  { href: "/account", label: "我的账号 Account" },
];

export function DashboardNav({
  role,
  orientation = "vertical",
}: {
  role: Role;
  orientation?: "vertical" | "horizontal";
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));

  return (
    <nav
      className={cn(
        "flex gap-1",
        orientation === "vertical"
          ? "flex-col"
          : "flex-row overflow-x-auto whitespace-nowrap",
      )}
    >
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
                ? "bg-neutral-900 text-white"
                : "text-neutral-700 hover:bg-neutral-100",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
