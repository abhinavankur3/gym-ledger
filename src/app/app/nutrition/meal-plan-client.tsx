"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FactTable } from "@/components/fact-table";
import { GeneratingOverlay } from "@/components/generating-overlay";
import { cn } from "@/lib/utils";
import { SLOT_LABEL, dayTotal, isProteinPowder, itemsTotal, type MealDay, type MealPlan } from "@/lib/nutrition/meal-plan";
import { INDIAN_REGIONS } from "@/lib/nutrition/region";
import type { NutritionTargets } from "@/lib/nutrition/targets";
import { buildMealPlan, confirmMealPlan, discardMealPlanDraft, setCuisineRegion } from "./actions";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FEEDBACK_LIMIT = 600;

function servingsLabel(servings: number) {
  if (servings === 1) return "";
  const whole = Math.floor(servings);
  const half = servings - whole >= 0.5 ? "½" : "";
  return `× ${whole || ""}${half}`;
}

/** One day's meals, with the day's total against the target. */
export function DayMeals({ day, targets }: { day: MealDay; targets: Pick<NutritionTargets, "kcal" | "protein"> }) {
  const total = dayTotal(day);
  const kcalPct = Math.min(100, (total.kcal / targets.kcal) * 100);
  // When the whole day was scaled by one factor, say it once instead of on every item
  const servings = new Set(day.meals.flatMap((m) => m.items.filter((i) => !isProteinPowder(i.name)).map((i) => i.servings)));
  const uniform = servings.size === 1 ? [...servings][0] : null;
  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-card p-5 shadow-soft dark:ring-1 dark:ring-white/5">
        <div className="flex items-baseline justify-between gap-4">
          <p className="font-display tabular text-3xl">{Math.round(total.kcal).toLocaleString()}<span className="ml-1 font-sans text-sm font-medium text-muted-foreground">of {targets.kcal.toLocaleString()} kcal</span></p>
          <p className="tabular text-sm font-semibold">{Math.round(total.protein)} g <span className="font-normal text-muted-foreground">protein of {targets.protein} g</span></p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-legs" style={{ width: `${kcalPct}%` }} />
        </div>
        {total.kcal < targets.kcal - 50 && (
          <p className="mt-2 text-xs text-muted-foreground">{Math.round((targets.kcal - total.kcal) / 10) * 10} kcal left open for extras.</p>
        )}
        {uniform !== null && uniform !== 1 && (
          <p className="mt-3 text-sm text-muted-foreground">Have {servingsLabel(uniform).replace("× ", "")}× each portion listed to reach your target.</p>
        )}
      </div>
      {day.meals.map((meal, index) => {
        const mealTotal = itemsTotal(meal.items);
        return (
          <section key={`${meal.slot}-${index}`} aria-label={SLOT_LABEL[meal.slot]} className="rounded-3xl bg-card p-5 shadow-soft dark:ring-1 dark:ring-white/5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-muted-foreground">{SLOT_LABEL[meal.slot]}</p>
              <p className="tabular text-sm text-muted-foreground">{Math.round(mealTotal.kcal)} kcal, {Math.round(mealTotal.protein)} g protein</p>
            </div>
            <h3 className="mt-1 font-display text-xl leading-tight">{meal.title}</h3>
            <FactTable
              className="mt-3"
              rows={meal.items.map((item, i) => ({
                key: `${item.name}-${i}`,
                label: (
                  <span className="block min-w-0">
                    <span className="block truncate">{item.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.portion} {uniform === null || isProteinPowder(item.name) ? servingsLabel(item.servings) : ""}</span>
                  </span>
                ),
                value: `${Math.round(item.kcal * item.servings)} kcal`,
              }))}
            />
          </section>
        );
      })}
    </div>
  );
}

/** Weekday picker + the chosen day's meals. */
export function WeekMeals({ plan, targets, today }: { plan: MealPlan; targets: NutritionTargets; today: number }) {
  const [day, setDay] = useState(today);
  return (
    <div>
      <div role="tablist" aria-label="Day of the week" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {WEEKDAYS.map((label, i) => (
          <button
            key={label}
            role="tab"
            aria-selected={day === i}
            onClick={() => setDay(i)}
            className={cn("flex h-14 min-w-14 shrink-0 flex-col items-center justify-center rounded-2xl px-3 text-sm font-semibold transition-colors", day === i ? "bg-primary text-primary-foreground shadow-glow" : "bg-card text-muted-foreground shadow-soft hover:text-foreground")}
          >
            {label}
            {i === today && <span className={cn("mt-0.5 h-1 w-1 rounded-full", day === i ? "bg-primary-foreground" : "bg-primary")} aria-label="Today" />}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <DayMeals day={plan.days[day] ?? plan.days[0]} targets={targets} />
      </div>
    </div>
  );
}

function useBuild() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const router = useRouter();
  function build(feedback = "") {
    setError("");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("feedback", feedback);
      const result = await buildMealPlan(formData);
      if (result?.error) setError(result.error);
      else {
        if (result?.source === "fallback") toast("Kochi couldn't reach the AI, so this draft uses a simpler built-in plan.");
        router.refresh();
      }
    });
  }
  return { pending, error, build };
}

const OVERLAY = { title: "Planning your meals", watermark: "Meals", tone: "legs" as const, art: "bowl" as const, body: "Building a week of meals around your targets, diet and local food. This can take up to a minute, so keep this screen open." };

export function BuildMealPlan() {
  const { pending, error, build } = useBuild();
  return (
    <div>
      {pending && <GeneratingOverlay {...OVERLAY} />}
      {error && <p role="alert" className="mb-3 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}
      <Button size="lg" className="w-full" onClick={() => build()} disabled={pending}>
        <Sparkles className="h-5 w-5" /> Build my meal plan
      </Button>
    </div>
  );
}

/** Feedback box + regenerate. Used for drafts and for changing an active plan. */
export function MealFeedback({ initial = "", title, hint, cta }: { initial?: string; title: string; hint: string; cta: string }) {
  const [feedback, setFeedback] = useState(initial);
  const { pending, error, build } = useBuild();
  return (
    <section aria-labelledby="meal-feedback-heading" className="rounded-3xl bg-card p-5 shadow-soft dark:ring-1 dark:ring-white/5">
      {pending && <GeneratingOverlay {...OVERLAY} />}
      <h2 id="meal-feedback-heading" className="font-display text-xl">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      <label htmlFor="meal-feedback" className="sr-only">What should change?</label>
      <textarea
        id="meal-feedback"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value.slice(0, FEEDBACK_LIMIT))}
        maxLength={FEEDBACK_LIMIT}
        disabled={pending}
        placeholder="e.g. Lighter dinners, more South Indian breakfasts, no paneer on weekdays."
        className="mt-4 min-h-24 w-full resize-y rounded-2xl border border-input bg-card p-4 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      />
      <p className={cn("mt-1 text-right text-xs text-muted-foreground", feedback.length >= FEEDBACK_LIMIT && "text-destructive")}>{feedback.length}/{FEEDBACK_LIMIT}</p>
      {error && <p role="alert" className="mt-2 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}
      <Button onClick={() => build(feedback)} disabled={pending} size="lg" variant="outline" className="mt-3 w-full">
        <RefreshCw className="h-5 w-5" /> {cta}
      </Button>
    </section>
  );
}

export function ConfirmMealPlan({ hasActive }: { hasActive: boolean }) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"confirm" | "discard" | null>(null);
  const router = useRouter();
  function run(kind: "confirm" | "discard") {
    setBusy(kind);
    startTransition(async () => {
      const result = kind === "confirm" ? await confirmMealPlan() : await discardMealPlanDraft();
      if (result && "error" in result && result.error) toast.error(result.error);
      else if (kind === "confirm") toast.success("Meal plan saved");
      router.refresh();
    });
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Button size="lg" onClick={() => run("confirm")} disabled={pending}>
        {pending && busy === "confirm" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} Use this meal plan
      </Button>
      {hasActive && (
        <Button size="lg" variant="outline" onClick={() => run("discard")} disabled={pending}>
          {pending && busy === "discard" && <Loader2 className="h-5 w-5 animate-spin" />} Keep my current plan
        </Button>
      )}
    </div>
  );
}

/** Optional regional cuisine for India; applies to the next plan Kochi builds. */
export function CuisinePicker({ value }: { value: string | null }) {
  const [current, setCurrent] = useState(value);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const options: Array<[string | null, string]> = [[null, "Mixed"], ...Object.entries(INDIAN_REGIONS).map(([k, v]) => [k, v.replace(" Indian", "")] as [string, string])];
  function choose(next: string | null) {
    setCurrent(next);
    startTransition(async () => {
      await setCuisineRegion(next);
      router.refresh();
    });
  }
  return (
    <div>
      <div role="radiogroup" aria-label="Regional cuisine" className="flex flex-wrap gap-2">
        {options.map(([key, label]) => (
          <button
            key={label}
            role="radio"
            aria-checked={current === key}
            disabled={pending}
            onClick={() => choose(key)}
            className={cn("h-10 rounded-full px-4 text-sm font-semibold transition-colors", current === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Used the next time Kochi builds your meal plan.</p>
    </div>
  );
}
