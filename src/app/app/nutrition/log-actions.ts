"use server";

import { and, desc, eq, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { mealLogs, nutritionPlans, userProfiles } from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/dal";
import { getUserTimeZone, localDateKey, localWeekday } from "@/lib/dates";
import { estimateFood } from "@/lib/ai/food-estimator";
import { countryFromTimeZone, cuisineFor } from "@/lib/nutrition/region";
import { MEAL_SLOTS, type MealItem, type MealPlan } from "@/lib/nutrition/meal-plan";
import { PORTIONS, confirmEstimate, logFromPlan, sumIntake, type LoggedMeal } from "@/lib/nutrition/meal-log";
import type { MealSlot } from "@/lib/nutrition/dish-catalog";

async function today() {
  const tz = await getUserTimeZone();
  const now = new Date();
  return { tz, date: localDateKey(now, tz), weekday: localWeekday(now, tz) };
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
export async function logPlannedMeal(slot: string, portion: number) {
  const session = await verifySession();
  if (!MEAL_SLOTS.includes(slot as MealSlot) || !PORTIONS.includes(portion as (typeof PORTIONS)[number])) return { error: "That portion isn't supported." };

  const active = await db.query.nutritionPlans.findFirst({ where: and(eq(nutritionPlans.userId, session.userId), eq(nutritionPlans.status, "active")) });
  if (!active) return { error: "Confirm a meal plan first." };
  const { date, weekday } = await today();
  const plan = JSON.parse(active.planJson) as MealPlan;
  const meal = plan.days[weekday]?.meals.find((m) => m.slot === slot);
  if (!meal) return { error: "There's no planned meal for that slot today." };

  const id = await saveLog(session.userId, date, logFromPlan(meal, portion), "plan", portion);
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
  const estimate = await estimateFood({ description, image, cuisine: cuisineFor(countryFromTimeZone(tz), profile?.cuisineRegion) });
  if (!estimate) return { error: "Kochi couldn't work that out. Try a clearer photo, or describe it in a few words." };
  return { success: true, estimate };
}

/** Path 2, step 2: save the estimate the user confirmed (after editing servings or removing items). */
export async function saveEstimatedMeal(input: { slot: string; title: string; items: MealItem[]; source: "photo" | "text" }) {
  const session = await verifySession();
  if (!MEAL_SLOTS.includes(input.slot as MealSlot)) return { error: "Choose which meal this was." };
  if (input.source !== "photo" && input.source !== "text") return { error: "Unknown source." };

  // Client-supplied numbers: re-validate every field before trusting them
  const items: MealItem[] = (Array.isArray(input.items) ? input.items : []).slice(0, 12).flatMap((i) => {
    const n = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max ? v : null);
    const kcal = n(i?.kcal, 2000), protein = n(i?.protein, 200), carbs = n(i?.carbs, 400), fat = n(i?.fat, 200), servings = n(i?.servings, 10);
    if (kcal === null || protein === null || carbs === null || fat === null || servings === null || typeof i?.name !== "string") return [];
    return [{ name: i.name, portion: typeof i.portion === "string" ? i.portion : "1 serving", servings, kcal, protein, carbs, fat }];
  });
  const log = confirmEstimate(input.slot as MealSlot, String(input.title ?? ""), items);
  if (!log) return { error: "Keep at least one item to log this meal." };

  const { date } = await today();
  const id = await saveLog(session.userId, date, log, input.source, null);
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
  const weekAgo = localDateKey(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), tz);
  const rows = await db.query.mealLogs.findMany({
    where: and(eq(mealLogs.userId, session.userId), gte(mealLogs.date, weekAgo)),
    orderBy: [desc(mealLogs.date), desc(mealLogs.createdAt)],
  });

  const todayLogs = rows
    .filter((r) => r.date === date)
    .map((r) => ({ id: r.id, slot: r.slot, source: r.source, title: r.title, portion: r.portion, items: JSON.parse(r.itemsJson) as MealItem[], kcal: r.kcal, protein: r.protein, carbs: r.carbs, fat: r.fat }));

  const history = Array.from({ length: 7 }, (_, i) => {
    const day = localDateKey(new Date(Date.now() - i * 24 * 60 * 60 * 1000), tz);
    return { date: day, ...sumIntake(rows.filter((r) => r.date === day)) };
  });

  return { date, today: todayLogs, totals: sumIntake(todayLogs), history };
}
