"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, LogOut } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { BrandMark } from "@/components/brand-mark";

export const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
];

export function isAdminNavActive(pathname: string, href: string) {
  return pathname === href || (href !== "/admin" && pathname.startsWith(href));
}

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-4 m-4 hidden h-[calc(100vh-2rem)] w-60 shrink-0 flex-col rounded-[1.75rem] bg-card p-4 shadow-lift md:flex dark:ring-1 dark:ring-white/5">
      <div className="mb-8 flex items-center gap-3 px-2 pt-1">
        <BrandMark className="h-10 w-10" />
        <div>
          <p className="font-display text-lg leading-tight">Gym Ledger</p>
          <p className="text-xs text-muted-foreground">Admin</p>
        </div>
      </div>

      <nav aria-label="Admin" className="flex-1 space-y-1">
        {adminNavItems.map((item) => {
          const isActive = isAdminNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <form action={logout}>
        <button
          type="submit"
          className="flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Log out
        </button>
      </form>
    </aside>
  );
}
