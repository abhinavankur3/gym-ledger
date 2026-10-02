import Link from "next/link";
import { Apple, BookOpen, CalendarCheck, ChevronRight, Scale, Settings } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";

const sections = [
  {
    title: "Track",
    items: [
      { href: "/app/metrics", label: "Body metrics", detail: "Log weight and measurements", icon: Scale },
      { href: "/app/attendance", label: "Attendance", detail: "Check in and see your streak", icon: CalendarCheck },
      { href: "/app/nutrition", label: "Nutrition", detail: "Coming next", icon: Apple },
    ],
  },
  {
    title: "Library",
    items: [{ href: "/app/exercises", label: "Exercises", detail: "Browse and add exercises", icon: BookOpen }],
  },
  {
    title: "Account",
    items: [{ href: "/app/settings", label: "Settings", detail: "Profile, units, password", icon: Settings }],
  },
];

export default async function MorePage() {
  const user = await getCurrentUser();

  return (
    <main className="px-4 pt-8">
      <h1 className="text-3xl font-bold tracking-tight">More</h1>
      <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>

      <div className="mt-8 space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-primary">{section.title}</p>
            <div className="space-y-2.5">
              {section.items.map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><item.icon className="h-5 w-5 text-primary" /></div>
                  <div className="min-w-0 flex-1"><p className="font-bold">{item.label}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{item.detail}</p></div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
