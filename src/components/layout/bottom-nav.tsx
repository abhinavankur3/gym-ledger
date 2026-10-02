"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Dumbbell,
  BarChart3,
  MessageCircle,
  LayoutGrid,
} from "lucide-react";

const navItems = [
  { href: "/app", label: "Home", icon: Home, match: ["/app"] },
  { href: "/app/workouts", label: "Workout", icon: Dumbbell, match: ["/app/workouts"] },
  { href: "/app/progress", label: "Progress", icon: BarChart3, match: ["/app/progress", "/app/charts"] },
  { href: "/app/coach", label: "Coach", icon: MessageCircle, match: ["/app/coach"] },
  {
    href: "/app/more",
    label: "More",
    icon: LayoutGrid,
    match: ["/app/more", "/app/metrics", "/app/attendance", "/app/exercises", "/app/nutrition", "/app/settings"],
  },
];

/** Bottom tab bar on mobile; fixed left rail from md up. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/70 bg-background/90 backdrop-blur-xl safe-bottom md:top-0 md:right-auto md:w-24 md:border-r md:border-t-0">
      <div className="mx-auto flex h-[4.5rem] max-w-md items-center justify-around px-1 md:h-full md:flex-col md:justify-center md:gap-3 md:px-0">
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
                "relative flex min-w-14 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition-colors md:w-16",
                isActive ? "bg-primary/12 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && <span className="absolute -top-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary md:top-1/2 md:-left-1 md:-translate-x-0 md:-translate-y-1/2" />}
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
