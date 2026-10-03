"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Check, Loader2, Scale, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MEAL_SLOTS, SLOT_LABEL, itemsTotal, type Meal } from "@/lib/nutrition/meal-plan";
import type { MealSlot } from "@/lib/nutrition/dish-catalog";
import { logPlannedMeal } from "./nutrition/log-actions";
import { LogOtherDialog, PORTION_CHOICES, PORTION_NAMES, type TodayLog } from "./nutrition/today-client";

/**
 * The next planned meal to log, picked from the time of day, with the same one-tap
 * logging as the Nutrition screen. A row of slot chips shows what's already logged.
 */
export function NextMeal({ meals, logs, currentSlot }: { meals: Meal[]; logs: TodayLog[]; currentSlot: MealSlot }) {
  const [pending, startTransition] = useTransition();
  const [showAmounts, setShowAmounts] = useState(false);
  const [otherSlot, setOtherSlot] = useState<MealSlot | null>(null);
  const router = useRouter();

  const isLogged = (slot: MealSlot) => logs.some((l) => l.slot === slot);
  const fromNow = MEAL_SLOTS.slice(MEAL_SLOTS.indexOf(currentSlot));
  // Next unlogged meal from now on; otherwise any earlier one still open (a missed breakfast)
  const next =
    meals.find((m) => fromNow.includes(m.slot) && !isLogged(m.slot)) ?? meals.find((m) => !isLogged(m.slot)) ?? null;

  function log(portion: number) {
    if (!next) return;
    setShowAmounts(false);
    navigator.vibrate?.(12);
    startTransition(async () => {
      const result = await logPlannedMeal(next.slot, portion);
      if (result?.error) toast.error(result.error);
      else toast.success(`${SLOT_LABEL[next.slot]} logged`);
      router.refresh();
    });
  }

  const planned = next ? itemsTotal(next.items) : null;

  return (
    <section aria-labelledby="next-meal-heading" className="rounded-3xl bg-card p-5 shadow-soft dark:ring-1 dark:ring-white/5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="next-meal-heading" className="font-display text-xl">{next ? `Next: ${SLOT_LABEL[next.slot].toLowerCase()}` : "Meals"}</h2>
        <ol className="flex gap-1.5" aria-label="Today's meals">
          {meals.map((m) => (
            <li
              key={m.slot}
              title={`${SLOT_LABEL[m.slot]}${isLogged(m.slot) ? ", logged" : ""}`}
              className={cn("flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[11px] font-bold", isLogged(m.slot) ? "bg-legs text-ink" : "bg-muted text-muted-foreground")}
            >
              {isLogged(m.slot) ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-label={`${SLOT_LABEL[m.slot]} logged`} /> : SLOT_LABEL[m.slot].slice(0, 1)}
            </li>
          ))}
        </ol>
      </div>

      {next && planned ? (
        <>
          <p className="mt-3 font-display text-2xl leading-tight">{next.title}</p>
          <p className="mt-1 tabular text-sm text-muted-foreground">{Math.round(planned.kcal)} kcal, {Math.round(planned.protein)} g protein</p>
          {showAmounts ? (
            <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="How much did you eat?">
              {PORTION_CHOICES.map(([value, label]) => (
                <button key={value} type="button" onClick={() => log(value)} disabled={pending} aria-label={`Log ${PORTION_NAMES[value]} the planned portion`} className="h-11 min-w-12 rounded-full bg-muted px-3 text-sm font-semibold hover:bg-primary hover:text-primary-foreground">
                  {label}
                </button>
              ))}
              <button type="button" onClick={() => setShowAmounts(false)} aria-label="Cancel" className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button onClick={() => log(1)} disabled={pending} className="h-12 rounded-full px-6" aria-label={`Log ${next.title} as planned`}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" strokeWidth={3} />} Ate it
              </Button>
              <button type="button" onClick={() => setShowAmounts(true)} className="h-11 rounded-xl px-3 text-sm font-semibold text-primary hover:bg-muted">Different amount</button>
              <button type="button" onClick={() => setOtherSlot(next.slot)} className="h-11 rounded-xl px-3 text-sm font-semibold text-primary hover:bg-muted">Something else</button>
            </div>
          )}
        </>
      ) : (
        <p className="mt-3 text-muted-foreground">Every planned meal is logged for today. Nice work.</p>
      )}
      <LogOtherDialog slot={otherSlot} onClose={() => setOtherSlot(null)} />
    </section>
  );
}

/** Quick actions: log any meal by photo or description, and log weight. Check-in sits beside these. */
export function QuickLogMeal({ currentSlot }: { currentSlot: MealSlot }) {
  const [slot, setSlot] = useState<MealSlot | null>(null);
  return (
    <>
      <button type="button" onClick={() => setSlot(currentSlot)} className="flex flex-col rounded-3xl bg-card p-4 text-left shadow-soft transition-transform active:scale-[0.98] dark:ring-1 dark:ring-white/5">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-legs/15 text-legs"><Camera className="h-5 w-5" /></span>
        <span className="mt-3 font-semibold leading-tight">Log a meal</span>
        <span className="mt-0.5 text-xs text-muted-foreground">Photo or a few words</span>
      </button>
      <LogOtherDialog slot={slot} onClose={() => setSlot(null)} />
    </>
  );
}

export function QuickLogWeight({ latest }: { latest: { value: number; unit: string } | null }) {
  return (
    <Link href="/app/metrics" className="flex flex-col rounded-3xl bg-card p-4 shadow-soft transition-transform active:scale-[0.98] dark:ring-1 dark:ring-white/5">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pull/15 text-pull"><Scale className="h-5 w-5" /></span>
      <span className="mt-3 font-semibold leading-tight">{latest ? `${latest.value.toFixed(1)} ${latest.unit}` : "Log weight"}</span>
      <span className="mt-0.5 text-xs text-muted-foreground">{latest ? "Tap to update" : "Keeps targets current"}</span>
    </Link>
  );
}
