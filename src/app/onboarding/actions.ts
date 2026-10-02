"use server";

import { redirect } from "next/navigation";
import db from "@/lib/db";
import { planDrafts, userProfiles } from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/dal";
import { onboardingSchema } from "@/lib/validators/schemas";
import { generatePlan } from "@/lib/ai/plan-generator";
import { AVOID_MAX, sanitizeUserText } from "@/lib/ai/user-text";

export async function completeOnboarding(_prev: { error?: string } | null, formData: FormData): Promise<{ error?: string } | null> {
  const session = await verifySession();
  const raw = {
    goal: formData.get("goal"),
    experience: formData.get("experience"),
    age: Number(formData.get("age")),
    sex: formData.get("sex"),
    height: Number(formData.get("height")),
    weight: Number(formData.get("weight")),
    activityLevel: formData.get("activityLevel"),
    trainingDays: Number(formData.get("trainingDays")),
    sessionDuration: Number(formData.get("sessionDuration")),
    equipment: formData.get("equipment"),
    dietaryPreferences: formData.get("dietaryPreferences"),
    restrictions: sanitizeUserText(String(formData.get("restrictions") ?? ""), AVOID_MAX) || undefined,
    avoidMovements: sanitizeUserText(String(formData.get("avoidMovements") ?? ""), AVOID_MAX) || undefined,
  };

  const parsed = onboardingSchema.safeParse(raw);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { error: field ? `Please check your ${String(field).replace(/([A-Z])/g, " $1").toLowerCase()} and try again.` : "Please complete each step to continue." };
  }

  await db.insert(userProfiles).values({
    userId: session.userId,
    ...parsed.data,
    updatedAt: new Date().toISOString(),
  }).onConflictDoUpdate({
    target: userProfiles.userId,
    set: { ...parsed.data, updatedAt: new Date().toISOString() },
  });

  const plan = await generatePlan(parsed.data);
  await db.insert(planDrafts).values({
    userId: session.userId,
    planJson: JSON.stringify(plan),
    feedback: null,
    updatedAt: new Date().toISOString(),
  }).onConflictDoUpdate({
    target: planDrafts.userId,
    set: { planJson: JSON.stringify(plan), feedback: null, updatedAt: new Date().toISOString() },
  });

  redirect("/app/plan");
}
