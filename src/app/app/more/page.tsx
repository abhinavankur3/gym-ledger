import Link from "next/link";
import { BookOpen, CalendarCheck, CalendarRange, ChevronRight, Scale, Settings } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";

const sections = [
  {
    title: "Training",
    items: [{ href: "/app/plan", label: "Your plan", detail: "Your week of sessions, and changes to it", icon: CalendarRange, tone: "bg-primary/12 text-primary" }],
  },
  {
    title: "Track",
    items: [
      { href: "/app/metrics", label: "Body metrics", detail: "Log weight and measurements", icon: Scale, tone: "bg-pull/15 text-pull" },
      { href: "/app/attendance", label: "Attendance", detail: "Check in and see your streak", icon: CalendarCheck, tone: "bg-legs/15 text-legs" },
    ],
  },
  {
    title: "Library",
    items: [{ href: "/app/exercises", label: "Exercises", detail: "Browse and add exercises", icon: BookOpen, tone: "bg-push/15 text-push" }],
  },
  {
    title: "Account",
    items: [{ href: "/app/settings", label: "Settings", detail: "Profile, units, theme, password", icon: Settings, tone: "bg-sun/20 text-ink dark:text-sun" }],
  },
];

export default async function MorePage() {
  const user = await getCurrentUser();

  return (
    <main className="pb-6">
      <PageHeader title="More" hideProfile />

      <Link href="/app/settings" className="flex items-center gap-4 rounded-3xl bg-ink p-5 text-white shadow-soft dark:bg-card dark:ring-1 dark:ring-white/5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sun font-display text-2xl text-ink">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-xl">{user.name}</span>
          <span className="mt-0.5 block truncate text-sm text-white/70">{user.email}</span>
        </span>
        <ChevronRight className="h-5 w-5 text-white/60" />
      </Link>

      <div className="mt-8 space-y-7">
        {sections.map((section) => (
          <section key={section.title} aria-labelledby={`more-${section.title}`}>
            <h2 id={`more-${section.title}`} className="mb-3 font-display text-lg">{section.title}</h2>
            <div className="divide-y divide-border overflow-hidden rounded-3xl bg-card shadow-soft dark:ring-1 dark:ring-white/5">
              {section.items.map((item) => (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/50">
                  <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", item.tone)}>
                    <item.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{item.label}</span>
                    <span className="mt-0.5 block truncate text-sm text-muted-foreground">{item.detail}</span>
                  </span>
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
