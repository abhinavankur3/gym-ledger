"use server";

import { and, asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { nutritionPlans, planDrafts, routines, userProfiles, workoutTemplateExercises } from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/dal";
import { generatePlan, normalizePlanFeedback, persistPlan } from "@/lib/ai/plan-generator";
import { isQuotaError, withAiQuota } from "@/lib/ai/quota";
import type { Plan } from "@/lib/ai/plan-types";

export async function getPlanDraft() {
  const session = await verifySession();
  const draft = await db.query.planDrafts.findFirst({
    where: eq(planDrafts.userId, session.userId),
  });

  if (!draft) return null;

  try {
    return {
      id: draft.id,
      feedback: draft.feedback ?? "",
      plan: JSON.parse(draft.planJson) as Plan,
    };
  } catch {
    return null;
  }
}

/** The confirmed, active plan: each training day with its exercises and targets. */
export async function getActivePlan() {
  const session = await verifySession();
  const routine = await db.query.routines.findFirst({
    where: and(eq(routines.userId, session.userId), eq(routines.isActive, true)),
    with: {
      days: {
        with: {
          template: {
            with: { exercises: { with: { exercise: true }, orderBy: [asc(workoutTemplateExercises.orderIndex)] } },
          },
        },
      },
    },
  });
  if (!routine) return null;

  return {
    name: routine.name,
    createdAt: routine.createdAt,
    days: routine.days
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
      .map((day) => ({
        dayOfWeek: day.dayOfWeek,
        templateId: day.template.id,
        name: day.template.name,
        exercises: day.template.exercises.map((te) => ({
          name: te.exercise.name,
          muscle: te.exercise.primaryMuscleGroup,
          sets: te.targetSets,
          reps: te.targetReps,
        })),
      })),
  };
}

export async function regeneratePlan(formData: FormData) {
  const session = await verifySession();
  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.userId, session.userId),
  });
  if (!profile) return { error: "Complete your profile before generating a plan." };

  const feedback = normalizePlanFeedback(String(formData.get("feedback") ?? ""));
  const generated = await withAiQuota(session.userId, "workout_plan", () => generatePlan(profile, session.userId, feedback));
  if (isQuotaError(generated)) return { error: generated.error };
  const { plan, source } = generated;

  await db.insert(planDrafts).values({
    userId: session.userId,
    planJson: JSON.stringify(plan),
    feedback,
    updatedAt: new Date().toISOString(),
  }).onConflictDoUpdate({
    target: planDrafts.userId,
    set: { planJson: JSON.stringify(plan), feedback, updatedAt: new Date().toISOString() },
  });

  revalidatePath("/app/plan");
  return { success: true, source };
}

export async function confirmPlan() {
  const session = await verifySession();
  // Claim the draft atomically: a double submit finds nothing left and does nothing
  const [draft] = await db.delete(planDrafts).where(eq(planDrafts.userId, session.userId)).returning();
  if (!draft) redirect("/app");

  let plan: Plan | null = null;
  try {
    plan = JSON.parse(draft.planJson) as Plan;
  } catch {
    plan = null;
  }
  if (!plan) redirect("/onboarding");

  try {
    await persistPlan(session.userId, plan);
  } catch (error) {
    // Put the draft back so the user can try again
    await db.insert(planDrafts).values({ userId: session.userId, planJson: draft.planJson, feedback: draft.feedback, updatedAt: new Date().toISOString() }).onConflictDoNothing();
    throw error;
  }
  revalidatePath("/app");
  // Training is set; if there's no active meal plan yet, that's the natural next step
  const hasMealPlan = await db.query.nutritionPlans.findFirst({ where: and(eq(nutritionPlans.userId, session.userId), eq(nutritionPlans.status, "active")), columns: { id: true } });
  redirect(hasMealPlan ? "/app" : "/app/nutrition");
}
