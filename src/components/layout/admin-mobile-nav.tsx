"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LogOut, Menu } from "lucide-react";
import { logout } from "@/lib/actions/auth";
import { BrandMark } from "@/components/brand-mark";
import { adminNavItems, isAdminNavActive } from "./admin-sidebar";

export function AdminMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-0 z-40 p-3 md:hidden">
      <div className="flex items-center justify-between rounded-[1.5rem] bg-card/95 py-2 pr-2 pl-3 shadow-lift backdrop-blur-xl dark:ring-1 dark:ring-white/5">
        <div className="flex items-center gap-3">
          <BrandMark className="h-9 w-9" />
          <div>
            <p className="font-display text-base leading-tight">Gym Ledger</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Open admin menu"
          onClick={() => setOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-2xl hover:bg-muted"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-72 rounded-l-[2rem] border-border p-4 shadow-lift">
          <SheetHeader className="px-2">
            <SheetTitle className="font-display text-xl">Menu</SheetTitle>
          </SheetHeader>
          <nav aria-label="Admin" className="space-y-1">
            {adminNavItems.map((item) => {
              const isActive = isAdminNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
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
          <div className="mt-auto">
            <form action={logout}>
              <button
                type="submit"
                className="flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <LogOut className="h-[18px] w-[18px]" />
                Log out
              </button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
