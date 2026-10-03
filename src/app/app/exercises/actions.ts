"use server";

import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import db from "@/lib/db";
import { exercises } from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/dal";
import { EXERCISE_CATEGORIES, MUSCLE_GROUPS } from "@/lib/ai/plan-types";

const customExerciseSchema = z.object({
  name: z.string().trim().min(2).max(60),
  category: z.enum(EXERCISE_CATEGORIES),
  primaryMuscleGroup: z.enum(MUSCLE_GROUPS),
});

export async function createCustomExercise(formData: FormData) {
  const session = await verifySession();

  const parsed = customExerciseSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    primaryMuscleGroup: formData.get("primaryMuscleGroup"),
  });
  if (!parsed.success) {
    return { error: "Give the exercise a name (2–60 characters), equipment and a muscle group." };
  }
  const { name, category, primaryMuscleGroup } = parsed.data;

  // Names are unique across the table, so check case-insensitively before inserting
  const existing = await db.query.exercises.findFirst({
    where: sql`lower(${exercises.name}) = lower(${name})`,
  });

  if (existing) {
    return { error: "An exercise with this name already exists." };
  }

  await db.insert(exercises).values({
    name,
    category,
    primaryMuscleGroup,
    secondaryMuscleGroups: "[]",
    isCustom: true,
    createdByUserId: session.userId,
  });

  revalidatePath("/app/exercises");
  return { success: true };
}
