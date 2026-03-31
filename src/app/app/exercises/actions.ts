"use server";

import { like, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { exercises } from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/dal";

export async function getExercises(search?: string, category?: string, muscleGroup?: string) {
  await verifySession();

  let query = db.select().from(exercises).$dynamic();

  // Build conditions - for simplicity we'll filter in JS for complex cases
  const allExercises = await db.query.exercises.findMany({
    orderBy: (exercises, { asc }) => [asc(exercises.primaryMuscleGroup), asc(exercises.name)],
  });

  return allExercises.filter((e) => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (category && category !== "all" && e.category !== category) return false;
    if (muscleGroup && muscleGroup !== "all" && e.primaryMuscleGroup !== muscleGroup) return false;
    return true;
  });
}

export async function createCustomExercise(formData: FormData) {
  const session = await verifySession();

  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const primaryMuscleGroup = formData.get("primaryMuscleGroup") as string;

  if (!name || !category || !primaryMuscleGroup) {
    return { error: "All fields are required." };
  }

  const existing = await db.query.exercises.findFirst({
    where: like(exercises.name, name),
  });

  if (existing) {
    return { error: "An exercise with this name already exists." };
  }

  await db.insert(exercises).values({
    name,
    category: category as "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight" | "cardio" | "other",
    primaryMuscleGroup,
    secondaryMuscleGroups: "[]",
    isCustom: true,
    createdByUserId: session.userId,
  });

  revalidatePath("/app/exercises");
  return { success: true };
}
