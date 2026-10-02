import { eq, and, gte, desc, sql } from "drizzle-orm";
import Link from "next/link";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { gymAttendance, workouts, bodyMetrics, planDrafts } from "@/lib/db/schema";
import { getRoutineWeek, getTodayTemplate } from "./routines/actions";
import { CheckInTile } from "./attendance/check-in-tile";
import { WeekBar } from "./week-bar";
import { Button } from "@/components/ui/button";
import { SessionHero } from "@/components/session-hero";
import { FactTable } from "@/components/fact-table";
import { ProfileButton } from "@/components/layout/page-header";
import { sessionTone } from "@/lib/muscles";
import {
  formatLocalLongDate,
  getUserTimeZone,
  greetingForHour,
  localHour,
  localWeekday,
  startOfLocalDayIso,
  startOfLocalWeekIso,
} from "@/lib/dates";
import { ChevronRight, Scale, Sparkles } from "lucide-react";

const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TONE_ART = { push: "dumbbell", pull: "kettlebell", legs: "plate", sun: "kettlebell" } as const;

export default async function AppDashboard() {
  const user = await getCurrentUser();
  const tz = await getUserTimeZone();
  const now = new Date();
  const today = localWeekday(now, tz);

  const [activeCheckIn, weekWorkouts, latestWeight, todayTemplate, routineWeek, pendingPlan] = await Promise.all([
    db.query.gymAttendance.findFirst({ where: and(eq(gymAttendance.userId, user.id), gte(gymAttendance.checkIn, startOfLocalDayIso(now, tz)), sql`${gymAttendance.checkOut} IS NULL`) }),
    db.query.workouts.findMany({ where: and(eq(workouts.userId, user.id), gte(workouts.startedAt, startOfLocalWeekIso(now, tz))), columns: { startedAt: true } }),
    db.query.bodyMetrics.findFirst({ where: and(eq(bodyMetrics.userId, user.id), eq(bodyMetrics.metricType, "weight")), orderBy: [desc(bodyMetrics.date)] }),
    getTodayTemplate(),
    getRoutineWeek(),
    db.query.planDrafts.findFirst({ where: eq(planDrafts.userId, user.id), columns: { id: true } }),
  ]);

  const doneDays = [...new Set(weekWorkouts.map((w) => localWeekday(new Date(w.startedAt), tz)))];
  const plannedDays = routineWeek.map((d) => d.dayOfWeek);
  const nextDay = routineWeek.find((d) => d.dayOfWeek > today) ?? routineWeek[0];
  const nextInDays = nextDay ? ((nextDay.dayOfWeek - today + 7) % 7 || 7) : null;
  const trainedToday = doneDays.includes(today);
  const workoutHref = todayTemplate ? `/app/workouts/new?templateId=${todayTemplate.id}` : "/app/workouts/new";
  const firstName = user.name.split(" ")[0];
  const note = coachNote({ sessions: doneDays.length, planned: plannedDays.length, hasWeight: !!latestWeight, trainedToday });
  const tone = todayTemplate ? sessionTone(todayTemplate.exercises.map((e) => e.primaryMuscleGroup)) : "sun";

  return (
    <main className="pb-6">
      <header className="flex items-center justify-between gap-4 pt-6 md:pt-10">
        <div>
          <p className="text-sm text-muted-foreground">{greetingForHour(localHour(now, tz))},</p>
          <h1 className="font-display text-[2rem]">{firstName}</h1>
        </div>
        <ProfileButton initial={user.name.slice(0, 1).toUpperCase()} />
      </header>

      {pendingPlan && (
        <Link href="/app/plan" className="mt-5 flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sun text-ink"><Sparkles className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Your plan is ready to review</span>
            <span className="mt-0.5 block text-sm text-muted-foreground">Confirm it, or ask for changes.</span>
          </span>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      )}

      {/* Today */}
      <section aria-label="Today" className="mt-6">
        {todayTemplate ? (
          <SessionHero
            tone={tone}
            kicker={trainedToday ? "Done for today" : `Today, ${formatLocalLongDate(now, tz).split(",")[0]}`}
            title={todayTemplate.name}
            art={TONE_ART[tone]}
            meta={`${todayTemplate.exercises.length} exercises`}
          />
        ) : nextDay ? (
          <SessionHero tone="sun" kicker="Rest day" title="Recover" watermark="Rest" art="plate" meta={`Next: ${nextDay.name}, ${nextInDays === 1 ? "tomorrow" : WEEKDAY_NAMES[nextDay.dayOfWeek]}`} />
        ) : (
          <SessionHero tone="sun" kicker={formatLocalLongDate(now, tz)} title="Open session" watermark="Train" art="kettlebell" meta="No plan scheduled today" />
        )}

        <div className="mt-16">
          {todayTemplate && (
            <>
              <h2 className="font-display text-xl">Session plan</h2>
              <FactTable
                className="mt-3"
                rows={todayTemplate.exercises.slice(0, 5).map((exercise, index) => ({
                  key: `${exercise.exerciseId}-${index}`,
                  label: exercise.name,
                  value: exercise.targetSets ? `${exercise.targetSets} × ${exercise.targetReps}` : "—",
                }))}
              />
              {todayTemplate.exercises.length > 5 && <p className="mt-2 text-sm text-muted-foreground">and {todayTemplate.exercises.length - 5} more</p>}
            </>
          )}
          <Link href={workoutHref} className="mt-5 block">
            <Button className="h-14 w-full rounded-2xl text-base font-semibold shadow-glow">
              {todayTemplate ? (trainedToday ? "Log another session" : `Start ${todayTemplate.name}`) : "Log a workout"}
            </Button>
          </Link>
        </div>
      </section>

      {/* Floating stat cards */}
      <section aria-label="Quick stats" className="mt-8 grid grid-cols-2 gap-3">
        <Link href="/app/metrics" className="flex flex-col rounded-3xl bg-card p-4 shadow-soft">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pull/15 text-pull"><Scale className="h-5 w-5" /></span>
          <span className="mt-4 text-sm text-muted-foreground">Body weight</span>
          {latestWeight ? (
            <span className="mt-1 flex items-baseline gap-1">
              <span className="font-display tabular text-3xl">{latestWeight.value.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground">{latestWeight.unit}</span>
            </span>
          ) : (
            <span className="mt-1 font-display text-2xl">Log weight</span>
          )}
        </Link>
        <CheckInTile checkInTime={activeCheckIn?.checkIn ?? null} />
      </section>

      {/* The week */}
      <section aria-labelledby="week-heading" className="mt-3 rounded-3xl bg-card p-5 shadow-soft">
        <div className="flex items-baseline justify-between">
          <h2 id="week-heading" className="font-display text-xl">This week</h2>
          <Link href="/app/workouts" className="text-sm font-semibold text-primary hover:underline">History</Link>
        </div>
        <div className="mt-2">
          <WeekBar doneDays={doneDays} plannedDays={plannedDays} today={today} />
        </div>
      </section>

      {/* Coach note */}
      <section aria-labelledby="coach-heading" className="mt-3 rounded-3xl bg-ink p-5 text-white shadow-soft dark:bg-card">
        <h2 id="coach-heading" className="font-display text-xl">From your coach</h2>
        <p className="mt-2 text-[1.0625rem] leading-7 text-white/85">{note.text}</p>
        <Link href={note.href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-sun hover:underline">
          {note.cta} <ChevronRight className="h-4 w-4" />
        </Link>
      </section>
    </main>
  );
}

function coachNote({ sessions, planned, hasWeight, trainedToday }: { sessions: number; planned: number; hasWeight: boolean; trainedToday: boolean }) {
  if (sessions === 0) return { text: "A new week starts empty. One logged session gives us something to build on, so make the first one easy to finish.", href: "/app/workouts/new", cta: "Log a workout" };
  if (!hasWeight) return { text: "Your training log is filling up. Add a body-weight entry so progress isn’t judged on lifts alone.", href: "/app/metrics", cta: "Log your weight" };
  if (planned && sessions >= planned) return { text: "Every planned session is in for this week. Extra work is optional; sleep and protein will do more for you now.", href: "/app/progress", cta: "See your progress" };
  if (trainedToday) return { text: "Session logged. The next one matters more than squeezing in another today.", href: "/app/progress", cta: "See your progress" };
  return { text: `${sessions} session${sessions === 1 ? "" : "s"} so far this week. Keep the rhythm and the numbers will follow.`, href: "/app/progress", cta: "See your progress" };
}
