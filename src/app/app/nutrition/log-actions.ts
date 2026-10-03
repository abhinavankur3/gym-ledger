"use server";

import { and, desc, eq, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { mealLogs, nutritionPlans, userProfiles } from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/dal";
import { getUserTimeZone, localDateKey, localWeekday, localDateKeyDaysAgo } from "@/lib/dates";
import { estimateFood } from "@/lib/ai/food-estimator";
import { isQuotaError, withAiQuota } from "@/lib/ai/quota";
import { countryFromTimeZone, cuisineFor } from "@/lib/nutrition/region";
import { MEAL_SLOTS, cleanLabel, type MealItem, type MealPlan } from "@/lib/nutrition/meal-plan";
import { BACKDATE_DAYS, PORTIONS, confirmEstimate, isAllowedLogDate, logFromPlan, sumIntake, weekdayOfDateKey, type LoggedMeal } from "@/lib/nutrition/meal-log";
import type { MealSlot } from "@/lib/nutrition/dish-catalog";

/** Upper bound for one logged meal; anything bigger is almost certainly a mistake. */
const MAX_MEAL_KCAL = 5000;

async function today() {
  const tz = await getUserTimeZone();
  const now = new Date();
  return { tz, date: localDateKey(now, tz), weekday: localWeekday(now, tz) };
}

/** The day a log is for: today by default, or a past day inside the backdating window. */
async function logDay(requested?: string | null) {
  const t = await today();
  if (!requested || requested === t.date) return t;
  if (!isAllowedLogDate(requested, t.date, localDateKeyDaysAgo(new Date(), BACKDATE_DAYS, t.tz))) return null;
  return { tz: t.tz, date: requested, weekday: weekdayOfDateKey(requested) };
}

async function saveLog(userId: number, date: string, log: LoggedMeal, source: "plan" | "photo" | "text", portion: number | null) {
  const [row] = await db
    .insert(mealLogs)
    .values({
      userId,
      date,
      slot: log.slot,
      source,
      title: log.title,
      itemsJson: JSON.stringify(log.items),
      kcal: log.totals.kcal,
      protein: log.totals.protein,
      carbs: log.totals.carbs,
      fat: log.totals.fat,
      portion,
    })
    .returning({ id: mealLogs.id });
  revalidatePath("/app/nutrition");
  revalidatePath("/app");
  return row.id;
}

/** Path 1: one tap on a planned meal, at a portion of the plan. */
export async function logPlannedMeal(slot: string, portion: number, date?: string) {
  const session = await verifySession();
  if (!MEAL_SLOTS.includes(slot as MealSlot) || !PORTIONS.includes(portion as (typeof PORTIONS)[number])) return { error: "That portion isn't supported." };

  const active = await db.query.nutritionPlans.findFirst({ where: and(eq(nutritionPlans.userId, session.userId), eq(nutritionPlans.status, "active")) });
  if (!active) return { error: "Confirm a meal plan first." };
  const day = await logDay(date);
  if (!day) return { error: `You can log meals for the last ${BACKDATE_DAYS} days, not the future.` };
  let plan: MealPlan;
  try {
    plan = JSON.parse(active.planJson) as MealPlan;
  } catch {
    return { error: "Your meal plan couldn't be read. Build a new version." };
  }
  const meal = plan.days[day.weekday]?.meals.find((m) => m.slot === slot);
  if (!meal) return { error: "There's no planned meal for that slot on that day." };

  // A double tap shouldn't log the same planned meal twice
  const existing = await db.query.mealLogs.findFirst({
    where: and(eq(mealLogs.userId, session.userId), eq(mealLogs.date, day.date), eq(mealLogs.slot, slot as MealSlot), eq(mealLogs.source, "plan")),
    columns: { id: true },
  });
  if (existing) return { success: true, id: existing.id };

  const id = await saveLog(session.userId, day.date, logFromPlan(meal, portion), "plan", portion);
  return { success: true, id };
}

/** Path 2, step 1: estimate from a photo and/or a description. Nothing is saved yet. */
export async function estimateMeal(formData: FormData) {
  const session = await verifySession();
  const description = String(formData.get("description") ?? "");
  const image = String(formData.get("image") ?? "") || undefined;
  if (!description.trim() && !image) return { error: "Add a photo or describe what you ate." };

  const profile = await db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, session.userId), columns: { cuisineRegion: true } });
  const { tz } = await today();
  const estimate = await withAiQuota(session.userId, "food_estimate", () => estimateFood({ description, image, cuisine: cuisineFor(countryFromTimeZone(tz), profile?.cuisineRegion) }));
  if (isQuotaError(estimate)) return { error: estimate.error };
  if (!estimate) return { error: "Kochi couldn't work that out. Try a clearer photo, or describe it in a few words." };
  return { success: true, estimate };
}

/** Path 2, step 2: save the estimate the user confirmed (after editing servings or removing items). */
export async function saveEstimatedMeal(input: { slot: string; title: string; items: MealItem[]; source: "photo" | "text"; date?: string }) {
  const session = await verifySession();
  if (!MEAL_SLOTS.includes(input.slot as MealSlot)) return { error: "Choose which meal this was." };
  if (input.source !== "photo" && input.source !== "text") return { error: "Unknown source." };

  // Client-supplied numbers: re-validate every field before trusting them
  const items: MealItem[] = (Array.isArray(input.items) ? input.items : []).slice(0, 12).flatMap((i) => {
    const n = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? v : null);
    const kcal = n(i?.kcal, 2000), protein = n(i?.protein, 200), carbs = n(i?.carbs, 400), fat = n(i?.fat, 200), servings = n(i?.servings, 10);
    if (kcal === null || protein === null || carbs === null || fat === null || servings === null || typeof i?.name !== "string") return [];
    const name = cleanLabel(i.name, 60);
    if (name.length < 2) return [];
    return [{ name, portion: cleanLabel(typeof i.portion === "string" ? i.portion : "", 40) || "1 serving", servings, kcal, protein, carbs, fat }];
  });
  const log = confirmEstimate(input.slot as MealSlot, String(input.title ?? ""), items);
  if (!log) return { error: "Keep at least one item to log this meal." };
  if (log.totals.kcal > MAX_MEAL_KCAL) return { error: "That's more than a single meal could be. Check the amounts and try again." };

  const day = await logDay(input.date);
  if (!day) return { error: `You can log meals for the last ${BACKDATE_DAYS} days, not the future.` };
  const id = await saveLog(session.userId, day.date, log, input.source, null);
  return { success: true, id };
}

export async function deleteMealLog(id: number) {
  const session = await verifySession();
  await db.delete(mealLogs).where(and(eq(mealLogs.id, id), eq(mealLogs.userId, session.userId)));
  revalidatePath("/app/nutrition");
  revalidatePath("/app");
  return { success: true };
}

/** Today's logs plus a 7-day history of daily totals. */
export async function getIntake() {
  const session = await verifySession();
  const { date, tz } = await today();
  const weekAgo = localDateKeyDaysAgo(new Date(), 6, tz);
  const rows = await db.query.mealLogs.findMany({
    where: and(eq(mealLogs.userId, session.userId), gte(mealLogs.date, weekAgo)),
    orderBy: [desc(mealLogs.date), desc(mealLogs.createdAt)],
  });

  const parseItems = (json: string): MealItem[] => {
    try {
      return JSON.parse(json) as MealItem[];
    } catch {
      return [];
    }
  };
  const todayLogs = rows
    .filter((r) => r.date === date)
    .map((r) => ({ id: r.id, slot: r.slot, source: r.source, title: r.title, portion: r.portion, items: parseItems(r.itemsJson), kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat }));

  const history = Array.from({ length: 7 }, (_, i) => {
    const day = localDateKeyDaysAgo(new Date(), i, tz);
    return { date: day, ...sumIntake(rows.filter((r) => r.date === day)) };
  });

  return { date, today: todayLogs, totals: sumIntake(todayLogs), history };
}

/** One day for the attendance calendar: its logged meals, that weekday's planned meals, and the gym visit. */
export async function getDayDetail(date: string) {
  const session = await verifySession();
  const day = await logDay(date);
  if (!day) return { error: `You can open the last ${BACKDATE_DAYS} days.` };

  const [logs, active] = await Promise.all([
    db.query.mealLogs.findMany({ where: and(eq(mealLogs.userId, session.userId), eq(mealLogs.date, day.date)), orderBy: [desc(mealLogs.createdAt)] }),
    db.query.nutritionPlans.findFirst({ where: and(eq(nutritionPlans.userId, session.userId), eq(nutritionPlans.status, "active")), columns: { planJson: true } }),
  ]);
  let plannedMeals: MealPlan["days"][number]["meals"] = [];
  try {
    plannedMeals = active ? (JSON.parse(active.planJson) as MealPlan).days[day.weekday]?.meals ?? [] : [];
  } catch {
    plannedMeals = [];
  }
  return {
    success: true,
    date: day.date,
    isToday: day.date === (await today()).date,
    plannedMeals,
    logs: logs.map((l) => ({ id: l.id, slot: l.slot, source: l.source, title: l.title, portion: l.portion, kcal: l.kcal, protein: l.protein })),
    totals: sumIntake(logs),
  };
}
