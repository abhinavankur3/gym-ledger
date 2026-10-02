"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand-mark";
import {
  Home,
  Dumbbell,
  BarChart3,
  MessageCircle,
  LayoutGrid,
  Salad,
} from "lucide-react";

const navItems = [
  { href: "/app", label: "Home", icon: Home, match: ["/app"] },
  { href: "/app/workouts", label: "Train", icon: Dumbbell, match: ["/app/workouts"] },
  { href: "/app/nutrition", label: "Nutrition", icon: Salad, match: ["/app/nutrition"] },
  { href: "/app/progress", label: "Progress", icon: BarChart3, match: ["/app/progress", "/app/charts", "/app/metrics", "/app/attendance"] },
  { href: "/app/coach", label: "Coach", icon: MessageCircle, match: ["/app/coach"] },
  // Desktop rail only; on mobile, "More" is reached from the profile button in page headers.
  { href: "/app/more", label: "More", icon: LayoutGrid, match: ["/app/more", "/app/exercises", "/app/settings"], desktopOnly: true },
];

/** Floating tab bar on mobile; floating left rail from md up. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom,0px))] z-50 rounded-[1.75rem] border border-border bg-card/95 shadow-lift backdrop-blur-xl md:inset-x-auto md:bottom-4 md:left-4 md:top-4 md:w-20"
    >
      <Link href="/app" aria-label="Gym Ledger home" className="hidden md:mx-auto md:mt-5 md:flex md:justify-center">
        <BrandMark className="h-10 w-10" />
      </Link>
      <div className="flex h-16 items-center justify-around px-1 md:absolute md:inset-x-0 md:top-1/2 md:h-auto md:-translate-y-1/2 md:flex-col md:gap-3">
        {navItems.map((item) => {
          const isActive =
            item.href === "/app"
              ? pathname === "/app"
              : item.match.some((prefix) => pathname.startsWith(prefix));

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors md:w-full md:flex-none",
                item.desktopOnly && "hidden md:flex",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-2xl transition-colors",
                  isActive && "bg-primary text-primary-foreground shadow-glow"
                )}
              >
                <item.icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.25 : 1.9} />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
