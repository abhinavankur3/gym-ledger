import { eq, and, gte, desc, sql } from "drizzle-orm";
import Link from "next/link";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { gymAttendance, workouts, bodyMetrics, planDrafts } from "@/lib/db/schema";
import { getRoutineWeek, getTodayTemplate } from "./routines/actions";
import { startOrResumeSession } from "./workouts/actions";
import { getNutritionState } from "./nutrition/actions";
import { getIntake } from "./nutrition/log-actions";
import { SubmitButton } from "@/components/submit-button";
import { CheckInTile } from "./attendance/check-in-tile";
import { WeekBar } from "./week-bar";
import { NextMeal, QuickLogMeal, QuickLogWeight } from "./home-client";
import { EquipmentArt } from "@/components/equipment-art";
import { ProfileButton } from "@/components/layout/page-header";
import { TONE_BG, sessionTone } from "@/lib/muscles";
import { slotForHour } from "@/lib/nutrition/meal-log";
import { cn } from "@/lib/utils";
import {
  formatLocalLongDate,
  getUserTimeZone,
  greetingForHour,
  localHour,
  localWeekday,
  startOfLocalDayIso,
  startOfLocalWeekIso,
} from "@/lib/dates";
import { ChevronRight, Dumbbell, Salad, Sparkles, TrendingUp } from "lucide-react";
import { ensureWeeklyReview } from "@/lib/adaptive/weekly";
import type { TodayLog } from "./nutrition/today-client";

const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TONE_ART = { push: "dumbbell", pull: "kettlebell", legs: "plate", sun: "kettlebell" } as const;

/** Home: today at a glance, and the next thing to do for training and food. */
export default async function AppDashboard() {
  const user = await getCurrentUser();
  const tz = await getUserTimeZone();
  const now = new Date();
  const today = localWeekday(now, tz);
  const hour = localHour(now, tz);
  const currentSlot = slotForHour(hour);

  const [activeCheckIn, weekWorkouts, latestWeight, todayTemplate, routineWeek, pendingPlan, nutrition, intake] = await Promise.all([
    db.query.gymAttendance.findFirst({ where: and(eq(gymAttendance.userId, user.id), gte(gymAttendance.checkIn, startOfLocalDayIso(now, tz)), sql`${gymAttendance.checkOut} IS NULL`) }),
    db.query.workouts.findMany({ where: and(eq(workouts.userId, user.id), gte(workouts.startedAt, startOfLocalWeekIso(now, tz))), columns: { startedAt: true, templateId: true, completedAt: true } }),
    db.query.bodyMetrics.findFirst({ where: and(eq(bodyMetrics.userId, user.id), eq(bodyMetrics.metricType, "weight")), orderBy: [desc(bodyMetrics.date)] }),
    getTodayTemplate(),
    getRoutineWeek(),
    db.query.planDrafts.findFirst({ where: eq(planDrafts.userId, user.id), columns: { id: true } }),
    getNutritionState(),
    getIntake(),
  ]);
  // First open of a new week builds last week's check-in (pure rules, no AI)
  const review = await ensureWeeklyReview(user.id, tz);
  const pendingChanges = review?.proposals.filter((p) => p.status === "pending").length ?? 0;

  // Only finished sessions count as done; an open one shows as "Resume" instead
  const doneDays = [...new Set(weekWorkouts.filter((w) => w.completedAt).map((w) => localWeekday(new Date(w.startedAt), tz)))];
  const plannedDays = routineWeek.map((d) => d.dayOfWeek);
  const nextDay = routineWeek.find((d) => d.dayOfWeek > today) ?? routineWeek[0];
  const nextInDays = nextDay ? ((nextDay.dayOfWeek - today + 7) % 7 || 7) : null;
  const trainedToday = doneDays.includes(today);
  const openSession = !!todayTemplate && weekWorkouts.some((w) => w.templateId === todayTemplate.id && !w.completedAt && localWeekday(new Date(w.startedAt), tz) === today);
  const firstName = user.name.split(" ")[0];

  const targets = nutrition?.targets ?? null;
  const mealPlan = nutrition?.active ?? null;
  const todayMeals = mealPlan?.plan.days[today]?.meals ?? [];
  const todayLogs: TodayLog[] = intake.today.map((l) => ({ id: l.id, slot: l.slot, source: l.source, title: l.title, portion: l.portion, kcal: l.kcal, protein: l.protein }));
  const proteinLeft = targets ? Math.round(targets.protein - intake.totals.protein) : 0;

  const training = todayTemplate
    ? trainedToday
      ? { label: "Done", detail: todayTemplate.name, tone: "bg-legs text-ink" }
      : openSession
        ? { label: "In progress", detail: todayTemplate.name, tone: "bg-sun text-ink" }
        : { label: "Planned", detail: todayTemplate.name, tone: "bg-push/15 text-push" }
    : nextDay
      ? { label: "Rest day", detail: `Next ${nextInDays === 1 ? "tomorrow" : WEEKDAY_NAMES[nextDay.dayOfWeek].slice(0, 3)}`, tone: "bg-muted text-muted-foreground" }
      : { label: "Open", detail: "No plan today", tone: "bg-muted text-muted-foreground" };

  const note = coachNote({
    sessions: doneDays.length,
    planned: plannedDays.length,
    hasWeight: !!latestWeight,
    trainedToday,
    proteinLeft: mealPlan ? proteinLeft : 0,
    hour,
  });

  return (
    <main className="pb-6">
      <header className="flex items-center justify-between gap-4 pt-6 md:pt-10">
        <div>
          <p className="text-sm text-muted-foreground">{greetingForHour(hour)}, {formatLocalLongDate(now, tz).split(",")[0]}</p>
          <h1 className="font-display text-[2rem]">{firstName}</h1>
        </div>
        <ProfileButton initial={user.name.slice(0, 1).toUpperCase()} />
      </header>

      {/* At a glance */}
      <section aria-label="Today at a glance" className="mt-5 grid grid-cols-3 gap-2.5">
        <div className="rounded-3xl bg-card p-3.5 shadow-soft dark:ring-1 dark:ring-white/5">
          <p className="text-xs text-muted-foreground">Training</p>
          <span className={cn("mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-bold", training.tone)}>{training.label}</span>
          <p className="mt-1.5 truncate text-sm font-semibold">{training.detail}</p>
        </div>
        {targets ? (
          <>
            <GlanceMeter label="Calories" value={intake.totals.kcal} target={targets.kcal} unit="kcal" />
            <GlanceMeter label="Protein" value={intake.totals.protein} target={targets.protein} unit="g" />
          </>
        ) : (
          <Link href="/onboarding" className="col-span-2 flex items-center rounded-3xl bg-card p-3.5 text-sm font-semibold shadow-soft dark:ring-1 dark:ring-white/5">
            Finish your profile to get calorie and protein targets
          </Link>
        )}
      </section>

      {pendingChanges > 0 && (
        <Banner href="/app/review" icon={<TrendingUp className="h-5 w-5" />} tone="bg-pull" title="Your weekly check-in is ready" detail={`Kochi suggests ${pendingChanges} change${pendingChanges === 1 ? "" : "s"} based on last week.`} />
      )}
      {pendingPlan && (
        <Banner href="/app/plan" icon={<Sparkles className="h-5 w-5" />} tone="bg-sun" title="Your training plan is ready to review" detail="Confirm it, or ask for changes." />
      )}
      {nutrition?.draft && !pendingPlan && (
        <Banner href="/app/nutrition" icon={<Salad className="h-5 w-5" />} tone="bg-legs" title="Your meal plan is ready to review" detail="Confirm it to start logging meals." />
      )}
      {targets && !mealPlan && !nutrition?.draft && !pendingPlan && (
        <Banner href="/app/nutrition" icon={<Salad className="h-5 w-5" />} tone="bg-legs" title="Build your meal plan" detail="A week of local meals matched to your targets." />
      )}

      {/* Today's session */}
      <section aria-labelledby="session-heading" className="mt-4">
        <SessionCard
          tone={todayTemplate ? sessionTone(todayTemplate.exercises.map((e) => e.primaryMuscleGroup)) : "sun"}
          kicker={todayTemplate ? (trainedToday ? "Done for today" : "Today's session") : nextDay ? "Rest day" : "Today"}
          title={todayTemplate ? todayTemplate.name : nextDay ? "Recover" : "Open session"}
          detail={
            todayTemplate
              ? todayTemplate.exercises.slice(0, 3).map((e) => e.name).join(", ") + (todayTemplate.exercises.length > 3 ? ` and ${todayTemplate.exercises.length - 3} more` : "")
              : nextDay
                ? `Next up: ${nextDay.name}, ${nextInDays === 1 ? "tomorrow" : WEEKDAY_NAMES[nextDay.dayOfWeek]}`
                : "No plan scheduled. Log whatever you train."
          }
        >
          {todayTemplate ? (
            <form action={startOrResumeSession.bind(null, todayTemplate.id)}>
              <SubmitButton className="h-12 w-full rounded-2xl">
                <Dumbbell className="h-4 w-4" />
                {openSession ? `Resume ${todayTemplate.name}` : trainedToday ? "Log another session" : `Start ${todayTemplate.name}`}
              </SubmitButton>
            </form>
          ) : (
            <Link href="/app/workouts/new" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 text-sm font-semibold text-white">
              <Dumbbell className="h-4 w-4" /> Log a workout
            </Link>
          )}
        </SessionCard>
      </section>

      {/* Next meal */}
      {todayMeals.length > 0 && (
        <div className="mt-4">
          <NextMeal meals={todayMeals} logs={todayLogs} currentSlot={currentSlot} />
        </div>
      )}

      {/* Quick actions */}
      <section aria-label="Quick actions" className="mt-4 grid grid-cols-3 gap-2.5">
        <QuickLogMeal currentSlot={currentSlot} />
        <QuickLogWeight latest={latestWeight ? { value: latestWeight.value, unit: latestWeight.unit } : null} />
        <CheckInTile checkInTime={activeCheckIn?.checkIn ?? null} />
      </section>

      {/* The week */}
      <section aria-labelledby="week-heading" className="mt-4 rounded-3xl bg-card p-5 shadow-soft dark:ring-1 dark:ring-white/5">
        <div className="flex items-baseline justify-between">
          <h2 id="week-heading" className="font-display text-xl">This week</h2>
          <Link href="/app/plan" className="text-sm font-semibold text-primary hover:underline">Your plan</Link>
        </div>
        <div className="mt-2">
          <WeekBar doneDays={doneDays} plannedDays={plannedDays} today={today} />
        </div>
      </section>

      {/* Coach note */}
      <section aria-labelledby="coach-heading" className="mt-4 rounded-3xl bg-ink p-5 text-white shadow-soft dark:bg-card">
        <h2 id="coach-heading" className="font-display text-xl">From Kochi</h2>
        <p className="mt-2 text-[1.0625rem] leading-7 text-white/85">{note.text}</p>
        <Link href={note.href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-sun hover:underline">
          {note.cta} <ChevronRight className="h-4 w-4" />
        </Link>
      </section>
    </main>
  );
}

function GlanceMeter({ label, value, target, unit }: { label: string; value: number; target: number; unit: string }) {
  const pct = target ? Math.min(100, (value / target) * 100) : 0;
  return (
    <Link href="/app/nutrition" className="rounded-3xl bg-card p-3.5 shadow-soft dark:ring-1 dark:ring-white/5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-display tabular text-2xl leading-none">{Math.round(value).toLocaleString()}</p>
      <p className="mt-1 tabular text-[11px] text-muted-foreground">of {target.toLocaleString()} {unit}</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className={cn("h-full rounded-full", value > target * 1.1 ? "bg-push" : "bg-legs")} style={{ width: `${pct}%` }} />
      </div>
    </Link>
  );
}

function Banner({ href, icon, tone, title, detail }: { href: string; icon: React.ReactNode; tone: string; title: string; detail: string }) {
  return (
    <Link href={href} className="mt-4 flex items-center gap-3 rounded-3xl bg-card p-4 shadow-soft dark:ring-1 dark:ring-white/5">
      <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-ink", tone)}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{detail}</span>
      </span>
      <ChevronRight className="h-5 w-5 text-muted-foreground" />
    </Link>
  );
}

/** Compact version of the session hero for Home: colour block, name, first exercises, one button. */
function SessionCard({ tone, kicker, title, detail, children }: { tone: keyof typeof TONE_ART; kicker: string; title: string; detail: string; children: React.ReactNode }) {
  return (
    <div className={cn("relative overflow-hidden rounded-[2rem] p-5 text-ink", TONE_BG[tone])}>
      <span aria-hidden className="pointer-events-none absolute -left-1 top-6 select-none whitespace-nowrap font-display text-[5.5rem] leading-none text-white/25">{title}</span>
      <EquipmentArt kind={TONE_ART[tone]} className="pointer-events-none absolute -right-4 -top-2 w-32 opacity-95" />
      <div className="relative">
        <p className="text-sm font-semibold text-ink/70">{kicker}</p>
        <h2 id="session-heading" className="mt-6 max-w-[65%] font-display text-[2rem] leading-[0.95]">{title}<span className="text-white">.</span></h2>
        <p className="mt-2 line-clamp-2 max-w-[85%] text-sm font-medium text-ink/75">{detail}</p>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function coachNote({ sessions, planned, hasWeight, trainedToday, proteinLeft, hour }: { sessions: number; planned: number; hasWeight: boolean; trainedToday: boolean; proteinLeft: number; hour: number }) {
  if (proteinLeft >= 25 && hour >= 18) return { text: `You're about ${proteinLeft} g short on protein today. Your planned shake or a protein-rich dinner closes the gap.`, href: "/app/nutrition", cta: "See today's meals" };
  if (sessions === 0) return { text: "A new week starts empty. One logged session gives us something to build on, so make the first one easy to finish.", href: "/app/workouts/new", cta: "Log a workout" };
  if (!hasWeight) return { text: "Your training log is filling up. Add a body-weight entry so progress isn’t judged on lifts alone.", href: "/app/metrics", cta: "Log your weight" };
  if (planned && sessions >= planned) return { text: "Every planned session is in for this week. Extra work is optional; sleep and protein will do more for you now.", href: "/app/progress", cta: "See your progress" };
  if (trainedToday) return { text: "Session logged. The next one matters more than squeezing in another today.", href: "/app/progress", cta: "See your progress" };
  return { text: `${sessions} session${sessions === 1 ? "" : "s"} so far this week. Keep the rhythm and the numbers will follow.`, href: "/app/progress", cta: "See your progress" };
}
