import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ProfileButton } from "@/components/layout/page-header";
import { SessionHero } from "@/components/session-hero";
import { getUserTimeZone, localHour, localWeekday } from "@/lib/dates";
import { FactTable } from "@/components/fact-table";
import { slotForHour } from "@/lib/nutrition/meal-log";
import { METHOD_LABEL, type NutritionTargets } from "@/lib/nutrition/targets";
import { getNutritionState } from "./actions";
import { getIntake } from "./log-actions";
import { IntakeSummary, LogOtherButton, TodayMeals, type TodayLog } from "./today-client";
import { BuildMealPlan, ConfirmMealPlan, CuisinePicker, MealFeedback, WeekMeals } from "./meal-plan-client";

const DIET_LABEL = { none: "No restrictions", vegetarian: "Vegetarian", vegan: "Vegan", eggetarian: "Eggetarian", jain: "Jain" } as const;

export default async function NutritionPage() {
  const state = await getNutritionState();
  if (!state) redirect("/onboarding");
  const tz = await getUserTimeZone();
  const today = localWeekday(new Date(), tz);
  const defaultSlot = slotForHour(localHour(new Date(), tz));
  const intake = await getIntake();
  const { targets, active, draft } = state;
  const todayLogs: TodayLog[] = intake.today.map((l) => ({ id: l.id, slot: l.slot, source: l.source, title: l.title, portion: l.portion, kcal: l.kcal, protein: l.protein }));

  return (
    <main className="pb-6">
      <div className="flex justify-end pt-6 md:pt-10"><ProfileButton /></div>
      <SessionHero
        tone="legs"
        kicker={draft ? "New meal plan to review" : active ? "Your meals" : "Nutrition"}
        title={draft ? "Review your meals" : active ? "Eat to the plan" : "Fuel the plan"}
        watermark="Fuel"
        art="bowl"
        asHeading
        meta={`${targets.kcal.toLocaleString()} kcal and ${targets.protein} g protein a day`}
        className="mt-3"
      />

      <div className="mt-16 space-y-6">
        <section aria-labelledby="today-heading" className="space-y-3">
          <h2 id="today-heading" className="font-display text-2xl">Today</h2>
          <div className="rounded-3xl bg-card p-5 shadow-soft dark:ring-1 dark:ring-white/5">
            <IntakeSummary eaten={intake.totals} targets={targets} />
          </div>
          {active ? (
            <TodayMeals meals={active.plan.days[today]?.meals ?? []} logs={todayLogs} defaultSlot={defaultSlot} />
          ) : (
            <>
              {todayLogs.length > 0 && <p className="text-sm text-muted-foreground">{todayLogs.length} meal{todayLogs.length === 1 ? "" : "s"} logged today.</p>}
              <LogOtherButton defaultSlot={defaultSlot} />
            </>
          )}
        </section>

        <TargetsCard targets={targets} weightFromLog={state.weightFromLog} />

        {draft ? (
          <>
            <section aria-labelledby="draft-heading">
              <h2 id="draft-heading" className="font-display text-2xl">Your new week</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {draft.cuisine}, {DIET_LABEL[state.diet].toLowerCase()}.{draft.source === "fallback" && " Built from Kochi's simpler offline plan because the AI wasn't available."}
                {active && " Your current plan stays until you confirm this one."}
              </p>
              <div className="mt-4"><WeekMeals plan={draft.plan} targets={draft.targets} today={today} /></div>
            </section>
            <ConfirmMealPlan hasActive={!!active} />
            <MealFeedback initial={draft.feedback} title="Want a change?" hint="Tell Kochi what to swap, add or avoid, then build another version." cta="Build another version" />
          </>
        ) : active ? (
          <>
            <section aria-labelledby="week-heading">
              <h2 id="week-heading" className="font-display text-2xl">Your week</h2>
              <p className="mt-1 text-sm text-muted-foreground">{active.plan.name}: {active.cuisine}, {DIET_LABEL[state.diet].toLowerCase()}.</p>
              {targetsChanged(active.targets, targets) && (
                <p className="mt-3 rounded-2xl bg-sun/25 px-4 py-3 text-sm">Your targets have moved since this plan was built. Build a new version below to match them.</p>
              )}
              <div className="mt-4"><WeekMeals plan={active.plan} targets={targets} today={today} /></div>
            </section>
            {state.country?.code === "IN" && (
              <section aria-labelledby="cuisine-heading" className="rounded-3xl bg-card p-5 shadow-soft dark:ring-1 dark:ring-white/5">
                <h2 id="cuisine-heading" className="font-display text-xl">Regional food</h2>
                <p className="mt-1 mb-4 text-sm text-muted-foreground">Kochi plans around Indian home cooking. Pick a region if you&apos;d like it closer to home.</p>
                <CuisinePicker value={state.indianRegion} />
              </section>
            )}
            <MealFeedback title="Change my meal plan" hint="Tell Kochi what isn't working. You'll review the new week before it replaces this one." cta="Build a new version" />
          </>
        ) : (
          <section aria-labelledby="start-heading" className="rounded-3xl bg-card p-5 shadow-soft dark:ring-1 dark:ring-white/5">
            <h2 id="start-heading" className="font-display text-xl">A week of meals, built for you</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Kochi plans everyday {state.cuisine.replace(" home cooking", "").replace(" food", "")} meals around these targets, your {DIET_LABEL[state.diet].toLowerCase()} diet and anything you avoid. You&apos;ll review it before it&apos;s saved.
            </p>
            {state.country?.code === "IN" && <div className="mt-4"><CuisinePicker value={state.indianRegion} /></div>}
            <div className="mt-5"><BuildMealPlan /></div>
          </section>
        )}
        {intake.history.some((d) => d.meals > 0) && (
          <section aria-labelledby="history-heading">
            <h2 id="history-heading" className="font-display text-2xl">Last 7 days</h2>
            <FactTable
              className="mt-3"
              rows={intake.history.map((d) => ({
                key: d.date,
                label: (
                  <span className="block">
                    <span className="block">{d.date === intake.date ? "Today" : new Date(`${d.date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}</span>
                    <span className="block text-xs text-muted-foreground">{d.meals ? `${d.meals} meal${d.meals === 1 ? "" : "s"}, ${Math.round(d.protein)} g protein` : "Nothing logged"}</span>
                  </span>
                ),
                value: d.meals ? `${Math.round((d.kcal / targets.kcal) * 100)}%` : "—",
              }))}
            />
            <p className="mt-2 text-xs text-muted-foreground">Share of your daily calorie target.</p>
          </section>
        )}
      </div>
    </main>
  );
}

function targetsChanged(a: NutritionTargets, b: NutritionTargets) {
  return Math.abs(a.kcal - b.kcal) / b.kcal > 0.05 || Math.abs(a.protein - b.protein) > 10;
}

function TargetsCard({ targets, weightFromLog }: { targets: NutritionTargets; weightFromLog: boolean }) {
  const b = targets.breakdown;
  const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "0");
  return (
    <section aria-labelledby="targets-heading" className="rounded-3xl bg-card p-5 shadow-soft dark:ring-1 dark:ring-white/5">
      <h2 id="targets-heading" className="font-display text-xl">Daily targets</h2>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        {[
          ["Calories", targets.kcal.toLocaleString(), "kcal"],
          ["Protein", targets.protein, "g"],
          ["Carbs", targets.carbs, "g"],
          ["Fat", targets.fat, "g"],
        ].map(([label, value, unit]) => (
          <div key={label} className="rounded-2xl bg-muted/60 px-1 py-3">
            <p className="font-display tabular text-xl">{value}</p>
            <p className="text-[11px] text-muted-foreground">{unit} {label.toString().toLowerCase()}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">Meals cover about 80% of this. A protein shake makes up the rest of your protein, and what&apos;s left of the calories is yours to use. All numbers are estimates, not medical advice.</p>
      <details className="group mt-4">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-primary">
          How Kochi worked this out <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
        </summary>
        <dl className="mt-3 space-y-1.5 text-sm">
          <Row label={`Resting energy (${METHOD_LABEL[b.method]})`} value={`${b.rmr} kcal`} />
          <Row label="Daily life" value={`${b.dailyLife} kcal`} />
          <Row label="Training, averaged over the week" value={`${signed(b.training)} kcal`} />
          <Row label="Maintenance" value={`${b.maintenance} kcal`} />
          <Row label="For your goal" value={`${signed(b.goalAdjustment)} kcal`} />
          {b.adaptiveAdjustment !== 0 && <Row label="From your weekly reviews" value={`${signed(b.adaptiveAdjustment)} kcal`} />}
          <Row label="Protein" value={`${b.proteinPerKg} g per kg`} />
        </dl>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Formulas are a starting estimate and can be off by 10% for any one person. Kochi will refine these from your real weight trend as you log.
        </p>
      </details>
      {!weightFromLog && (
        <Link href="/app/metrics" className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">Log today&apos;s weight to keep this current</Link>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular font-semibold">{value}</dd>
    </div>
  );
}
