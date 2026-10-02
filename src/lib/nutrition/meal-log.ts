/**
 * Intake logging rules. Pure — no database or network — so it's unit-tested.
 * Path 1: a planned meal logged at a portion of the plan (one tap).
 * Path 2: an AI estimate from a photo or a description, confirmed by the user.
 */
import type { MealSlot } from "./dish-catalog";
import { cleanItem, cleanLabel, itemsTotal, type Meal, type MealItem, type RawMealPlan, type Totals } from "./meal-plan";

/** Portion choices offered for a planned meal ("ate half", "had extra"). */
export const PORTIONS = [0.5, 0.75, 1, 1.25, 1.5] as const;

export type LoggedMeal = {
  slot: MealSlot;
  title: string;
  items: MealItem[];
  totals: Totals;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export function roundTotals(t: Totals): Totals {
  return { kcal: Math.round(t.kcal), protein: round1(t.protein), carbs: round1(t.carbs), fat: round1(t.fat) };
}

/** A planned meal as eaten at `portion` of the plan. */
export function logFromPlan(meal: Meal, portion: number): LoggedMeal {
  const p = Math.min(3, Math.max(0.25, portion));
  const items = meal.items.map((item) => ({ ...item, servings: Math.round(item.servings * p * 100) / 100 }));
  return { slot: meal.slot, title: meal.title, items, totals: roundTotals(itemsTotal(items)) };
}

/** Best guess of the meal from the local time, used as the default for photo and text logs. */
export function slotForHour(hour: number): MealSlot {
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 19) return "snack";
  return "dinner";
}

export type DayIntake = Totals & { meals: number };

export function sumIntake(logs: Array<Pick<Totals, "kcal" | "protein" | "carbs" | "fat">>): DayIntake {
  const t = logs.reduce((a, l) => ({ kcal: a.kcal + l.kcal, protein: a.protein + l.protein, carbs: a.carbs + l.carbs, fat: a.fat + l.fat }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  return { ...roundTotals(t), meals: logs.length };
}

export type FoodEstimate = {
  title: string;
  items: MealItem[];
  confidence: "high" | "medium" | "low";
  note: string;
};

/** "A", "A and B", "A, B and C" from the first three item names (parenthetical detail dropped). */
export function titleFromItems(items: MealItem[]) {
  const names = items.slice(0, 3).map((i, idx) => {
    const base = i.name.replace(/\s*\(.*?\)\s*/g, " ").trim();
    return idx === 0 ? base : base.toLowerCase();
  });
  return names.length <= 1 ? names[0] ?? "" : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** True when a model title doesn't name any of the foods ("Estimated meal", "Home cooking"). */
export function isGenericTitle(title: string, items: MealItem[]) {
  const words = (t: string) => t.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4);
  const itemWords = new Set(items.flatMap((i) => words(i.name)));
  return !title.trim() || !words(title).some((w) => itemWords.has(w));
}

type RawEstimate = { title: string; items: RawMealPlan["days"][number]["meals"][number]["items"]; confidence: string; note: string };

/** Cleans a model estimate with the same rules as plan items; null if nothing usable. */
export function resolveEstimate(raw: RawEstimate): FoodEstimate | null {
  const items = (raw.items ?? []).slice(0, 12).map(cleanItem).filter((i): i is MealItem => !!i);
  if (!items.length) return null;
  const confidence = raw.confidence === "high" || raw.confidence === "medium" ? raw.confidence : "low";
  return {
    title: (() => {
      const title = cleanLabel(String(raw.title ?? ""), 80);
      return isGenericTitle(title, items) ? titleFromItems(items) : title;
    })(),
    items,
    confidence,
    note: cleanLabel(String(raw.note ?? ""), 160),
  };
}

/** Re-totals a confirmed estimate after the user adjusts servings or removes items. */
export function confirmEstimate(slot: MealSlot, title: string, items: MealItem[]): LoggedMeal | null {
  const kept = items
    .map((i) => ({ ...i, servings: Math.min(10, Math.max(0, Math.round(i.servings * 100) / 100)) }))
    .filter((i) => i.servings > 0);
  if (!kept.length) return null;
  return { slot, title: cleanLabel(title, 80) || kept.map((i) => i.name).join(", "), items: kept, totals: roundTotals(itemsTotal(kept)) };
}
