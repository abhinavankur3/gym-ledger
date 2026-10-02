"use server";

import { and, asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { planDrafts, routines, userProfiles, workoutTemplateExercises } from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/dal";
import { generatePlan, normalizePlanFeedback, persistPlan } from "@/lib/ai/plan-generator";
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
  const plan = await generatePlan(profile, feedback);

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
  return { success: true };
}

export async function confirmPlan() {
  const session = await verifySession();
  const draft = await db.query.planDrafts.findFirst({
    where: and(eq(planDrafts.userId, session.userId)),
  });
  if (!draft) redirect("/app");

  let plan: Plan;
  try {
    plan = JSON.parse(draft.planJson) as Plan;
  } catch {
    redirect("/onboarding");
  }

  await persistPlan(session.userId, plan!);
  await db.delete(planDrafts).where(eq(planDrafts.userId, session.userId));
  revalidatePath("/app");
  revalidatePath("/app/routines");
  revalidatePath("/app/workouts/templates");
  redirect("/app");
}
