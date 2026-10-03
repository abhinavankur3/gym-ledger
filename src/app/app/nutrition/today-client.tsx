"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, ImageUp, Loader2, Minus, Pencil, Plus, Trash2, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MEAL_SLOTS, SLOT_LABEL, itemsTotal, type Meal, type MealItem } from "@/lib/nutrition/meal-plan";
import type { FoodEstimate } from "@/lib/nutrition/meal-log";
import type { MealSlot } from "@/lib/nutrition/dish-catalog";
import { deleteMealLog, estimateMeal, logPlannedMeal, saveEstimatedMeal } from "./log-actions";

export type TodayLog = { id: number; slot: MealSlot; source: "plan" | "photo" | "text"; title: string; portion: number | null; kcal: number; protein: number };

export const PORTION_CHOICES: Array<[number, string]> = [[0.5, "½"], [0.75, "¾"], [1.25, "1¼"], [1.5, "1½"]];
export const PORTION_NAMES: Record<number, string> = { 0.5: "half", 0.75: "three quarters of", 1.25: "a quarter more than", 1.5: "one and a half times" };

function portionLabel(p: number | null) {
  if (p === null || p === 1) return "";
  return `${PORTION_CHOICES.find(([v]) => v === p)?.[1] ?? p}× portion, `;
}

/** Today's planned meals: one tap to log as planned, or pick a different amount. */
export function TodayMeals({ meals, logs, defaultSlot }: { meals: Meal[]; logs: TodayLog[]; defaultSlot: MealSlot }) {
  const [pending, startTransition] = useTransition();
  const [busySlot, setBusySlot] = useState<string | null>(null);
  const [amountFor, setAmountFor] = useState<string | null>(null);
  const [otherFor, setOtherFor] = useState<MealSlot | null>(null);
  const router = useRouter();

  function log(slot: string, portion: number) {
    setBusySlot(slot);
    setAmountFor(null);
    navigator.vibrate?.(12);
    startTransition(async () => {
      const result = await logPlannedMeal(slot, portion);
      if (result?.error) toast.error(result.error);
      router.refresh();
      setBusySlot(null);
    });
  }

  function undo(id: number) {
    startTransition(async () => {
      await deleteMealLog(id);
      router.refresh();
    });
  }

  // Plan logs whose slot isn't on today's plan (e.g. the plan changed mid-day) must stay visible and deletable
  const renderedSlots = new Set(meals.map((m) => m.slot));
  const extras = logs.filter((l) => l.source !== "plan" || !renderedSlots.has(l.slot));

  return (
    <div className="space-y-3">
      {meals.map((meal, index) => {
        const planned = itemsTotal(meal.items);
        const logged = logs.find((l) => l.source === "plan" && l.slot === meal.slot);
        const busy = pending && busySlot === meal.slot;
        return (
          <section key={`${meal.slot}-${index}`} aria-label={SLOT_LABEL[meal.slot]} className={cn("rounded-3xl bg-card p-4 shadow-soft dark:ring-1 dark:ring-white/5", logged && "ring-1 ring-legs/50")}>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-muted-foreground">{SLOT_LABEL[meal.slot]}</p>
                <h3 className="mt-0.5 font-display text-lg leading-tight">{meal.title}</h3>
                <p className="mt-1 tabular text-sm text-muted-foreground">
                  {logged ? `Logged: ${portionLabel(logged.portion)}${Math.round(logged.kcal)} kcal, ${Math.round(logged.protein)} g protein` : `${Math.round(planned.kcal)} kcal, ${Math.round(planned.protein)} g protein`}
                </p>
              </div>
              {logged ? (
                <span aria-label="Logged" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-legs text-ink">
                  <Check className="h-5 w-5" strokeWidth={3} />
                </span>
              ) : (
                <Button onClick={() => log(meal.slot, 1)} disabled={pending} className="h-12 shrink-0 rounded-full px-5" aria-label={`Log ${meal.title} as planned`}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" strokeWidth={3} />} Ate it
                </Button>
              )}
            </div>
            {logged ? (
              <button type="button" onClick={() => undo(logged.id)} disabled={pending} className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
                <Undo2 className="h-4 w-4" /> Undo
              </button>
            ) : amountFor === meal.slot ? (
              <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="How much did you eat?">
                {PORTION_CHOICES.map(([value, label]) => (
                  <button key={value} type="button" onClick={() => log(meal.slot, value)} disabled={pending} aria-label={`Log ${PORTION_NAMES[value]} the planned portion`} className="h-10 min-w-12 rounded-full bg-muted px-3 text-sm font-semibold hover:bg-primary hover:text-primary-foreground">
                    {label}
                  </button>
                ))}
                <button type="button" onClick={() => setAmountFor(null)} aria-label="Cancel" className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1">
                <button type="button" onClick={() => setAmountFor(meal.slot)} className="inline-flex h-9 items-center rounded-xl px-2 text-sm font-semibold text-primary hover:bg-muted">Different amount</button>
                <button type="button" onClick={() => setOtherFor(meal.slot)} className="inline-flex h-9 items-center rounded-xl px-2 text-sm font-semibold text-primary hover:bg-muted">Ate something else</button>
              </div>
            )}
          </section>
        );
      })}

      {extras.length > 0 && (
        <section aria-label="Also logged" className="rounded-3xl bg-card p-4 shadow-soft dark:ring-1 dark:ring-white/5">
          <p className="text-sm font-semibold text-muted-foreground">Also logged today</p>
          <ul className="mt-2 divide-y divide-border">
            {extras.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">{l.source === "photo" ? <Camera className="h-4 w-4" /> : l.source === "plan" ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{l.title}</span>
                  <span className="tabular block text-xs text-muted-foreground">{SLOT_LABEL[l.slot]}, {Math.round(l.kcal)} kcal, {Math.round(l.protein)} g protein</span>
                </span>
                <button type="button" onClick={() => undo(l.id)} disabled={pending} aria-label={`Remove ${l.title}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Button variant="outline" size="lg" className="w-full" onClick={() => setOtherFor(defaultSlot)}>
        <Camera className="h-5 w-5" /> Log something else
      </Button>
      <LogOtherDialog slot={otherFor} onClose={() => setOtherFor(null)} />
    </div>
  );
}

/** Standalone entry point when there's no meal plan yet. */
export function LogOtherButton({ defaultSlot }: { defaultSlot: MealSlot }) {
  const [slot, setSlot] = useState<MealSlot | null>(null);
  return (
    <>
      <Button variant="outline" size="lg" className="w-full" onClick={() => setSlot(defaultSlot)}>
        <Camera className="h-5 w-5" /> Log a meal
      </Button>
      <LogOtherDialog slot={slot} onClose={() => setSlot(null)} />
    </>
  );
}

/** Shrinks a photo in the browser to ≤1024 px JPEG so uploads stay small. */
async function resizePhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.75);
}

/** Path 2: photo and/or description → Kochi's estimate → adjust → save. */
export function LogOtherDialog({ slot, onClose }: { slot: MealSlot | null; onClose: () => void }) {
  const open = slot !== null;
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-cols-1 overflow-y-auto overflow-x-hidden sm:max-w-md [&>*]:min-w-0">{open && <LogOtherForm initialSlot={slot} onDone={onClose} />}</DialogContent>
    </Dialog>
  );
}

function LogOtherForm({ initialSlot, onDone }: { initialSlot: MealSlot; onDone: () => void }) {
  const [slotChoice, setSlotChoice] = useState<MealSlot>(initialSlot);
  const [photo, setPhoto] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [estimate, setEstimate] = useState<FoodEstimate | null>(null);
  const [items, setItems] = useState<MealItem[]>([]);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function choosePhoto(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      setPhoto(await resizePhoto(file));
    } catch {
      setError("That image couldn't be read. Try another photo.");
    }
  }

  function runEstimate() {
    setError("");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("description", description);
      if (photo) formData.set("image", photo);
      const result = await estimateMeal(formData);
      if (result.error || !result.estimate) {
        setError(result.error ?? "Kochi couldn't work that out.");
        return;
      }
      setEstimate(result.estimate);
      setItems(result.estimate.items);
      setTitle(result.estimate.title);
    });
  }

  function save() {
    setError("");
    startTransition(async () => {
      const result = await saveEstimatedMeal({ slot: slotChoice, title, items, source: photo ? "photo" : "text" });
      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success("Meal logged");
      router.refresh();
      onDone();
    });
  }

  const setServings = (index: number, delta: number) =>
    setItems((list) => list.map((item, i) => (i === index ? { ...item, servings: Math.max(0, Math.round((item.servings + delta) * 2) / 2) } : item)));
  const total = itemsTotal(items);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{estimate ? "Check Kochi's estimate" : "Log a meal"}</DialogTitle>
        <DialogDescription>{estimate ? "Adjust amounts or remove anything that's wrong, then save." : "Snap a photo, describe it, or both. Kochi estimates the rest."}</DialogDescription>
      </DialogHeader>

      <div role="radiogroup" aria-label="Which meal" className="flex flex-wrap gap-2">
        {MEAL_SLOTS.map((s) => (
          <button key={s} type="button" role="radio" aria-checked={slotChoice === s} onClick={() => setSlotChoice(s)} className={cn("h-9 rounded-full px-3 text-sm font-semibold", slotChoice === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
            {SLOT_LABEL[s]}
          </button>
        ))}
      </div>

      {!estimate ? (
        <div className="space-y-3">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => choosePhoto(e.target.files?.[0])} aria-label="Food photo" />
          {photo ? (
            <div className="relative overflow-hidden rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
              <img src={photo} alt="Your meal" className="max-h-64 w-full object-cover" />
              <button type="button" onClick={() => setPhoto(null)} aria-label="Remove photo" className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-ink/70 text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary">
              <ImageUp className="h-6 w-6" />
              <span className="text-sm font-semibold">Take or choose a photo</span>
            </button>
          )}
          <label htmlFor="meal-description" className="sr-only">Describe the meal</label>
          <textarea
            id="meal-description"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 300))}
            maxLength={300}
            placeholder={photo ? "Anything the photo doesn't show? e.g. cooked in ghee, had 2 of these" : "e.g. 2 rotis, a katori of dal and some bhindi"}
            className="min-h-20 w-full resize-y rounded-2xl border border-input bg-card p-3 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          <p className="text-xs text-muted-foreground">Photos are sent to the AI to estimate the meal and aren&apos;t stored.</p>
          {error && <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}
          <Button size="lg" className="w-full" onClick={runEstimate} disabled={pending || (!photo && !description.trim())}>
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : null} {pending ? "Estimating…" : "Estimate"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <label htmlFor="meal-title" className="sr-only">Meal name</label>
          <input id="meal-title" value={title} onChange={(e) => setTitle(e.target.value.slice(0, 80))} className="h-11 w-full rounded-xl border border-input bg-card px-3 font-display text-lg outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          {estimate.confidence !== "high" && (
            <p className="rounded-2xl bg-sun/25 px-4 py-3 text-sm">{estimate.confidence === "low" ? "Rough estimate. " : ""}{estimate.note || "Check the amounts."}</p>
          )}
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {items.map((item, i) => (
              <li key={`${item.name}-${i}`} className={cn("flex items-center gap-2 px-3 py-2.5", item.servings === 0 && "opacity-50")}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{item.name}</span>
                  <span className="tabular block text-xs text-muted-foreground">{item.portion}, {Math.round(item.kcal * item.servings)} kcal</span>
                </span>
                <button type="button" onClick={() => setServings(i, -0.5)} aria-label={`Less ${item.name}`} className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted"><Minus className="h-4 w-4" /></button>
                <span className="tabular w-9 text-center text-sm font-semibold" aria-label={`${item.servings} servings`}>{item.servings}×</span>
                <button type="button" onClick={() => setServings(i, 0.5)} aria-label={`More ${item.name}`} className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted"><Plus className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
          <p className="tabular text-sm font-semibold">{Math.round(total.kcal)} kcal, {Math.round(total.protein)} g protein</p>
          {error && <p role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => { setEstimate(null); setItems([]); }} disabled={pending}>Start over</Button>
            <Button onClick={save} disabled={pending || total.kcal === 0}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save</Button>
          </div>
        </div>
      )}
    </>
  );
}

/** Today's intake against the targets. */
export function IntakeSummary({ eaten, targets }: { eaten: { kcal: number; protein: number }; targets: { kcal: number; protein: number } }) {
  const rows: Array<[string, number, number, string]> = [
    ["Calories", eaten.kcal, targets.kcal, "kcal"],
    ["Protein", eaten.protein, targets.protein, "g"],
  ];
  return (
    <div className="space-y-3">
      {rows.map(([label, value, target, unit]) => {
        const pct = target ? Math.min(100, (value / target) * 100) : 0;
        const left = Math.round(target - value);
        return (
          <div key={label}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold">{label}</p>
              <p className="tabular text-sm text-muted-foreground">
                <span className="font-display text-lg text-foreground">{Math.round(value).toLocaleString()}</span> of {target.toLocaleString()} {unit}
                {left > 0 ? `, ${left.toLocaleString()} to go` : ""}
              </p>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className={cn("h-full rounded-full", value > target * 1.1 ? "bg-push" : "bg-legs")} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
