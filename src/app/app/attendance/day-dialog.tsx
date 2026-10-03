"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Loader2, MapPin, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { SLOT_LABEL, itemsTotal, type Meal } from "@/lib/nutrition/meal-plan";
import type { MealSlot } from "@/lib/nutrition/dish-catalog";
import { deleteMealLog, getDayDetail, logPlannedMeal } from "../nutrition/log-actions";
import { LogOtherDialog, PORTION_CHOICES, PORTION_NAMES, type TodayLog } from "../nutrition/today-client";
import { getDayAttendance, setDayAttendance } from "./actions";

type Detail = { date: string; isToday: boolean; plannedMeals: Meal[]; logs: TodayLog[]; totals: { kcal: number; protein: number } };

function dayTitle(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

/** A past (or today's) day from the attendance calendar: gym visit and meals, all loggable after the fact. */
export function DayDialog({ date, onClose }: { date: string | null; onClose: () => void }) {
  return (
    <Dialog open={date !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-cols-1 overflow-y-auto overflow-x-hidden sm:max-w-md [&>*]:min-w-0">
        {date && <DayBody key={date} date={date} />}
      </DialogContent>
    </Dialog>
  );
}

function DayBody({ date }: { date: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [attended, setAttended] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [amountFor, setAmountFor] = useState<MealSlot | null>(null);
  const [otherSlot, setOtherSlot] = useState<MealSlot | null>(null);
  const router = useRouter();

  function load() {
    startTransition(async () => {
      const [d, a] = await Promise.all([getDayDetail(date), getDayAttendance(date)]);
      if (d.success) setDetail({ date: d.date, isToday: d.isToday, plannedMeals: d.plannedMeals, logs: d.logs, totals: d.totals });
      else setError(d.error ?? "That day couldn't be loaded.");
      setAttended(a.attended);
    });
  }
  // Load once per day opened (the dialog remounts this component for each date)
  useEffect(load, [date]);

  function refreshAll() {
    router.refresh();
    load();
  }

  function toggleGym() {
    const next = !attended;
    setAttended(next);
    startTransition(async () => {
      const result = await setDayAttendance(date, next);
      if (result?.error) {
        setAttended(!next);
        toast.error(result.error);
      }
      router.refresh();
    });
  }

  function logPlanned(slot: MealSlot, portion: number) {
    setAmountFor(null);
    startTransition(async () => {
      const result = await logPlannedMeal(slot, portion, date);
      if (result?.error) toast.error(result.error);
      refreshAll();
    });
  }

  function remove(id: number) {
    startTransition(async () => {
      await deleteMealLog(id);
      refreshAll();
    });
  }

  const loggedSlots = new Set(detail?.logs.filter((l) => l.source === "plan").map((l) => l.slot));

  return (
    <>
      <DialogHeader>
        <DialogTitle>{dayTitle(date)}</DialogTitle>
        <DialogDescription>{detail?.isToday ? "Today" : "Forgot to log something? Add it here."}</DialogDescription>
      </DialogHeader>

      {error && <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}

      {attended !== null && (
        <button
          type="button"
          onClick={toggleGym}
          disabled={pending}
          aria-pressed={attended}
          className={cn("flex items-center gap-3 rounded-2xl p-3 text-left transition-colors", attended ? "bg-legs/20" : "bg-muted/60 hover:bg-muted")}
        >
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", attended ? "bg-legs text-ink" : "bg-card text-muted-foreground")}>
            {attended ? <Check className="h-5 w-5" strokeWidth={3} /> : <MapPin className="h-5 w-5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">{attended ? "Went to the gym" : "Mark as a gym day"}</span>
            <span className="block text-xs text-muted-foreground">{attended ? "Tap to remove this visit" : "Counts toward your streak"}</span>
          </span>
        </button>
      )}

      {!detail ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-4">
          <p className="tabular text-sm text-muted-foreground">
            Logged: <span className="font-semibold text-foreground">{Math.round(detail.totals.kcal)} kcal</span>, {Math.round(detail.totals.protein)} g protein
          </p>

          {detail.plannedMeals.length > 0 && (
            <section aria-label="Planned meals" className="space-y-2">
              {detail.plannedMeals.map((meal) => {
                const done = loggedSlots.has(meal.slot);
                const total = itemsTotal(meal.items);
                return (
                  <div key={meal.slot} className={cn("rounded-2xl border border-border p-3", done && "border-legs/50 bg-legs/10")}>
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-muted-foreground">{SLOT_LABEL[meal.slot]}</p>
                        <p className="truncate font-semibold">{meal.title}</p>
                        <p className="tabular text-xs text-muted-foreground">{Math.round(total.kcal)} kcal, {Math.round(total.protein)} g protein</p>
                      </div>
                      {done ? (
                        <span aria-label="Logged" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-legs text-ink"><Check className="h-4 w-4" strokeWidth={3} /></span>
                      ) : (
                        <Button size="default" className="h-10 shrink-0 rounded-full px-4" onClick={() => logPlanned(meal.slot, 1)} disabled={pending} aria-label={`Log ${meal.title} as eaten`}>
                          <Check className="h-4 w-4" strokeWidth={3} /> Ate it
                        </Button>
                      )}
                    </div>
                    {!done &&
                      (amountFor === meal.slot ? (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label="How much did you eat?">
                          {PORTION_CHOICES.map(([value, label]) => (
                            <button key={value} type="button" onClick={() => logPlanned(meal.slot, value)} disabled={pending} aria-label={`Log ${PORTION_NAMES[value]} the planned portion`} className="h-9 min-w-10 rounded-full bg-muted px-3 text-sm font-semibold hover:bg-primary hover:text-primary-foreground">
                              {label}
                            </button>
                          ))}
                          <button type="button" onClick={() => setAmountFor(null)} aria-label="Cancel" className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
                        </div>
                      ) : (
                        <div className="mt-1 flex gap-1">
                          <button type="button" onClick={() => setAmountFor(meal.slot)} className="h-8 rounded-lg px-2 text-xs font-semibold text-primary hover:bg-muted">Different amount</button>
                          <button type="button" onClick={() => setOtherSlot(meal.slot)} className="h-8 rounded-lg px-2 text-xs font-semibold text-primary hover:bg-muted">Something else</button>
                        </div>
                      ))}
                  </div>
                );
              })}
            </section>
          )}

          {detail.logs.length > 0 && (
            <section aria-label="Logged meals">
              <p className="text-sm font-semibold">Logged that day</p>
              <ul className="mt-1 divide-y divide-border">
                {detail.logs.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 py-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">{l.source === "photo" ? <Camera className="h-4 w-4" /> : l.source === "text" ? <Pencil className="h-4 w-4" /> : <Check className="h-4 w-4" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{l.title}</span>
                      <span className="tabular block text-xs text-muted-foreground">{SLOT_LABEL[l.slot]}, {Math.round(l.kcal)} kcal</span>
                    </span>
                    <button type="button" onClick={() => remove(l.id)} disabled={pending} aria-label={`Remove ${l.title}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Button variant="outline" className="w-full" onClick={() => setOtherSlot("lunch")} disabled={pending}>
            <Camera className="h-4 w-4" /> Log a meal for this day
          </Button>
        </div>
      )}
      <LogOtherDialog slot={otherSlot} date={date} onClose={() => { setOtherSlot(null); refreshAll(); }} />
    </>
  );
}
