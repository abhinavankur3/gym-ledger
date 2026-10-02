"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { bodyMetrics, nutritionPlans, userProfiles } from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/dal";
import { getUserTimeZone } from "@/lib/dates";
import { generateMealPlan } from "@/lib/ai/meal-plan-generator";
import { FEEDBACK_MAX, sanitizeUserText } from "@/lib/ai/user-text";
import { computeTargets, type NutritionTargets } from "@/lib/nutrition/targets";
import { countryFromTimeZone, cuisineFor, INDIAN_REGIONS } from "@/lib/nutrition/region";
import type { DietPreference, MealPlan } from "@/lib/nutrition/meal-plan";

const LB_TO_KG = 0.45359237;

async function latestMetric(userId: number, metricType: string) {
  return db.query.bodyMetrics.findFirst({
    where: and(eq(bodyMetrics.userId, userId), eq(bodyMetrics.metricType, metricType)),
    orderBy: [desc(bodyMetrics.date), desc(bodyMetrics.id)],
  });
}

const DIETS: DietPreference[] = ["none", "vegetarian", "vegan", "eggetarian", "jain"];

/** Everything the nutrition screen needs, with targets recomputed from the latest weight. */
export async function getNutritionState() {
  const session = await verifySession();
  const profile = await db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, session.userId) });
  if (!profile) return null;

  const [weight, bodyFat, plans, timeZone] = await Promise.all([
    latestMetric(session.userId, "weight"),
    latestMetric(session.userId, "body_fat"),
    db.query.nutritionPlans.findMany({
      where: and(eq(nutritionPlans.userId, session.userId)),
      orderBy: [desc(nutritionPlans.updatedAt)],
      limit: 5,
    }),
    getUserTimeZone(),
  ]);

  const weightKg = weight ? (weight.unit === "lbs" ? weight.value * LB_TO_KG : weight.value) : profile.weight;
  const targets = computeTargets({
    sex: profile.sex,
    age: profile.age,
    heightCm: profile.height,
    weightKg,
    goal: profile.goal,
    experience: profile.experience,
    activityLevel: profile.activityLevel,
    trainingDays: profile.trainingDays,
    sessionMinutes: profile.sessionDuration,
    bodyFatPercent: bodyFat?.value ?? null,
  });

  const country = countryFromTimeZone(timeZone);
  const parse = (row: (typeof plans)[number] | undefined) =>
    row && { id: row.id, plan: JSON.parse(row.planJson) as MealPlan, targets: JSON.parse(row.targetsJson) as NutritionTargets, source: row.source, cuisine: row.cuisine, feedback: row.feedback ?? "", createdAt: row.createdAt };

  return {
    targets,
    weightKg,
    weightFromLog: !!weight,
    bodyFatPercent: bodyFat?.value ?? null,
    country,
    indianRegion: profile.cuisineRegion,
    cuisine: cuisineFor(country, profile.cuisineRegion),
    diet: (DIETS.includes(profile.dietaryPreferences as DietPreference) ? profile.dietaryPreferences : "none") as DietPreference,
    active: parse(plans.find((p) => p.status === "active")),
    draft: parse(plans.find((p) => p.status === "draft")),
  };
}

/** Generates a new draft (replacing any existing draft). The active plan stays until confirmed. */
export async function buildMealPlan(formData: FormData) {
  const session = await verifySession();
  const state = await getNutritionState();
  const profile = await db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, session.userId) });
  if (!state || !profile) return { error: "Finish onboarding before building a meal plan." };

  const feedback = sanitizeUserText(String(formData.get("feedback") ?? ""), FEEDBACK_MAX);
  const { plan, source } = await generateMealPlan({
    targets: state.targets,
    goal: profile.goal,
    diet: state.diet,
    avoidFoods: profile.restrictions,
    cuisine: state.cuisine,
    country: state.country,
    indianRegion: state.indianRegion,
    feedback,
  });

  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx.delete(nutritionPlans).where(and(eq(nutritionPlans.userId, session.userId), eq(nutritionPlans.status, "draft")));
    await tx.insert(nutritionPlans).values({
      userId: session.userId,
      status: "draft",
      planJson: JSON.stringify(plan),
      targetsJson: JSON.stringify(state.targets),
      source,
      cuisine: state.cuisine,
      feedback: feedback || null,
      createdAt: now,
      updatedAt: now,
    });
  });

  revalidatePath("/app/nutrition");
  revalidatePath("/app");
  return { success: true, source };
}

/** Makes the draft the active plan and archives the previous one. */
export async function confirmMealPlan() {
  const session = await verifySession();
  const draft = await db.query.nutritionPlans.findFirst({
    where: and(eq(nutritionPlans.userId, session.userId), eq(nutritionPlans.status, "draft")),
  });
  if (!draft) return { error: "There's no draft to confirm. Build a plan first." };

  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    await tx.update(nutritionPlans).set({ status: "archived", updatedAt: now }).where(and(eq(nutritionPlans.userId, session.userId), eq(nutritionPlans.status, "active")));
    await tx.update(nutritionPlans).set({ status: "active", updatedAt: now }).where(eq(nutritionPlans.id, draft.id));
  });

  revalidatePath("/app/nutrition");
  revalidatePath("/app");
  return { success: true };
}

export async function discardMealPlanDraft() {
  const session = await verifySession();
  await db.delete(nutritionPlans).where(and(eq(nutritionPlans.userId, session.userId), eq(nutritionPlans.status, "draft")));
  revalidatePath("/app/nutrition");
  return { success: true };
}

/** Sets (or clears) the sub-regional cuisine for India. Takes effect on the next plan. */
export async function setCuisineRegion(region: string | null) {
  const session = await verifySession();
  const value = region && region in INDIAN_REGIONS ? region : null;
  await db.update(userProfiles).set({ cuisineRegion: value, updatedAt: new Date().toISOString() }).where(eq(userProfiles.userId, session.userId));
  revalidatePath("/app/nutrition");
  return { success: true };
}
