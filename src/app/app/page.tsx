import { eq, and, gte, count, desc, sql } from "drizzle-orm";
import Link from "next/link";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { gymAttendance, workouts, bodyMetrics, planDrafts } from "@/lib/db/schema";
import { getNextTrainingDay, getTodayTemplate } from "./routines/actions";
import { CheckInTile } from "./attendance/check-in-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getUserTimeZone, greetingForHour, localHour, startOfLocalDayIso } from "@/lib/dates";
import { WEEKDAY_LABELS } from "@/lib/ai/plan-types";
import { Apple, ArrowUpRight, ChevronRight, Dumbbell, Flame, MessageCircle, Moon, Scale, Sparkles } from "lucide-react";

export default async function AppDashboard() {
  const user = await getCurrentUser();
  const tz = await getUserTimeZone();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [activeCheckIn, weekWorkouts, latestWeight, todayTemplate, nextDay, pendingPlan] = await Promise.all([
    db.query.gymAttendance.findFirst({ where: and(eq(gymAttendance.userId, user.id), gte(gymAttendance.checkIn, startOfLocalDayIso(now, tz)), sql`${gymAttendance.checkOut} IS NULL`) }),
    db.select({ value: count() }).from(workouts).where(and(eq(workouts.userId, user.id), gte(workouts.startedAt, weekAgo))),
    db.query.bodyMetrics.findFirst({ where: and(eq(bodyMetrics.userId, user.id), eq(bodyMetrics.metricType, "weight")), orderBy: [desc(bodyMetrics.date)] }),
    getTodayTemplate(),
    getNextTrainingDay(),
    db.query.planDrafts.findFirst({ where: eq(planDrafts.userId, user.id), columns: { id: true } }),
  ]);

  const workoutCount = weekWorkouts[0]?.value ?? 0;
  const workoutHref = todayTemplate ? `/app/workouts/new?templateId=${todayTemplate.id}` : "/app/workouts/new";
  const isRestDay = !todayTemplate && !!nextDay;
  const insight = coachInsight({ workoutCount, hasWeight: !!latestWeight, isRestDay, pendingPlan: !!pendingPlan });

  return (
    <main className="px-4 pt-8">
      <header className="flex items-start justify-between">
        <div><p className="text-sm font-medium text-muted-foreground">{greetingForHour(localHour(now, tz))}</p><h1 className="mt-1 text-3xl font-bold tracking-tight">{user.name}</h1></div>
        <Link href="/app/settings" aria-label="Open settings" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-sm font-bold text-primary">{user.name.slice(0, 1).toUpperCase()}</Link>
      </header>

      {pendingPlan && <Link href="/app/plan" className="mt-6 block"><Card className="rounded-3xl border-primary/25 bg-primary/5"><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/12"><Sparkles className="h-5 w-5 text-primary" /></div><div className="min-w-0 flex-1"><p className="font-bold">Your plan is ready to review</p><p className="mt-0.5 text-xs text-muted-foreground">Confirm it or add a note to regenerate.</p></div><ArrowUpRight className="h-4 w-4 text-primary" /></CardContent></Card></Link>}

      <section className="mt-8">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-primary">Today</p>
        <Card className="overflow-hidden rounded-3xl border-primary/20 bg-primary text-primary-foreground shadow-lg shadow-primary/10"><CardContent className="p-5">
          {todayTemplate ? (
            <><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-primary-foreground/70">Today&apos;s workout</p><p className="mt-1 text-2xl font-bold">{todayTemplate.name}</p></div><div className="rounded-2xl bg-primary-foreground/15 p-3"><Dumbbell className="h-6 w-6" /></div></div><p className="mt-4 text-sm text-primary-foreground/75">{todayTemplate.exercises.length} exercises · Ready when you are</p></>
          ) : isRestDay ? (
            <><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-primary-foreground/70">Rest day</p><p className="mt-1 text-2xl font-bold">Recover well.</p></div><div className="rounded-2xl bg-primary-foreground/15 p-3"><Moon className="h-6 w-6" /></div></div><p className="mt-4 text-sm text-primary-foreground/75">Next up: {nextDay.name} {nextDay.inDays === 1 ? "tomorrow" : `on ${WEEKDAY_LABELS[nextDay.dayOfWeek]}`}</p></>
          ) : (
            <><p className="text-2xl font-bold">Make today count.</p><p className="mt-2 max-w-[18rem] text-sm text-primary-foreground/75">Start a workout and your coach will help you build momentum from there.</p></>
          )}
          <Link href={workoutHref} className="mt-5 block"><Button className="h-12 w-full rounded-2xl bg-background font-bold text-foreground hover:bg-background/90">{isRestDay ? "Train anyway" : "Start workout"} <ArrowUpRight className="ml-2 h-4 w-4" /></Button></Link>
        </CardContent></Card>
      </section>

      <section className="mt-5 grid grid-cols-3 gap-2.5">
        <Link href="/app/workouts"><Stat icon={<Flame className="h-4 w-4" />} value={String(workoutCount)} label="Last 7 days" /></Link>
        <Link href="/app/metrics" aria-label={latestWeight ? "View body metrics" : "Log your weight"}><Stat icon={<Scale className="h-4 w-4" />} value={latestWeight ? latestWeight.value.toFixed(1) : "Log"} label={latestWeight ? latestWeight.unit : "Weight"} /></Link>
        <CheckInTile checkInTime={activeCheckIn?.checkIn ?? null} />
      </section>

      <section className="mt-8"><div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Keep the loop going</h2><Link href="/app/progress" className="text-sm font-semibold text-primary">See progress</Link></div><div className="space-y-2.5"><Link href="/app/nutrition" className="block"><ActionRow icon={<Apple className="h-5 w-5 text-primary" />} title="Log what you eat" detail="Nutrition tracking is coming next" /></Link><Link href="/app/coach" className="block"><ActionRow icon={<MessageCircle className="h-5 w-5 text-primary" />} title="Talk to your coach" detail="Get context on your progress" /></Link></div></section>

      <section className="mt-8 mb-3 rounded-3xl border border-border bg-card p-5"><div className="flex items-center gap-2 text-primary"><Sparkles className="h-4 w-4" /><p className="text-xs font-bold uppercase tracking-[0.14em]">Coach insight</p></div><p className="mt-3 text-base font-semibold leading-6">{insight.text}</p><Link href={insight.href} className="mt-4 inline-flex items-center text-sm font-bold text-primary">{insight.cta} <ChevronRight className="ml-1 h-4 w-4" /></Link></section>
    </main>
  );
}

function coachInsight({ workoutCount, hasWeight, isRestDay, pendingPlan }: { workoutCount: number; hasWeight: boolean; isRestDay: boolean; pendingPlan: boolean }) {
  if (pendingPlan) return { text: "Your first plan is drafted. Give it a quick look and lock it in so each day has a clear session.", href: "/app/plan", cta: "Review your plan" };
  if (workoutCount === 0) return { text: "Small, consistent sessions beat perfect plans. Log one workout this week and let the data guide what comes next.", href: "/app/workouts/new", cta: "Log a workout" };
  if (!hasWeight) return { text: `${workoutCount} session${workoutCount === 1 ? "" : "s"} in the last week. Add a body-weight entry so progress isn't measured on lifts alone.`, href: "/app/metrics", cta: "Log your weight" };
  if (isRestDay) return { text: `${workoutCount} session${workoutCount === 1 ? "" : "s"} in the last week. Rest days are when the adaptation happens — sleep and protein matter today.`, href: "/app/progress", cta: "See your progress" };
  return { text: `${workoutCount} session${workoutCount === 1 ? "" : "s"} in the last week. Keep stacking them — consistency is what moves the numbers.`, href: "/app/progress", cta: "See your progress" };
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) { return <Card className="h-full rounded-2xl border-border bg-card transition-colors hover:border-primary/40"><CardContent className="p-3"><div className="text-primary">{icon}</div><p className="mt-2 text-lg font-bold">{value}</p><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p></CardContent></Card>; }
function ActionRow({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) { return <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">{icon}</div><div className="min-w-0 flex-1"><p className="font-bold">{title}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{detail}</p></div><ChevronRight className="h-4 w-4 text-muted-foreground" /></div>; }
