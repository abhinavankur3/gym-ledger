"use server";

import { eq, and, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import {
  workoutTemplates,
  workoutTemplateExercises,
  exercises,
} from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/dal";

export async function getTemplates() {
  const session = await verifySession();

  const templates = await db.query.workoutTemplates.findMany({
    where: eq(workoutTemplates.userId, session.userId),
    with: {
      exercises: {
        with: {
          exercise: true,
        },
      },
    },
    orderBy: [asc(workoutTemplates.name)],
  });

  return templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    exerciseCount: t.exercises.length,
    muscleGroups: [
      ...new Set(t.exercises.map((e) => e.exercise.primaryMuscleGroup)),
    ],
    createdAt: t.createdAt,
  }));
}

export async function getTemplateWithExercises(templateId: number) {
  const session = await verifySession();

  const template = await db.query.workoutTemplates.findFirst({
    where: and(
      eq(workoutTemplates.id, templateId),
      eq(workoutTemplates.userId, session.userId)
    ),
    with: {
      exercises: {
        with: {
          exercise: true,
        },
        orderBy: [asc(workoutTemplateExercises.orderIndex)],
      },
    },
  });

  if (!template) return null;

  return {
    id: template.id,
    name: template.name,
    description: template.description,
    exercises: template.exercises.map((te) => ({
      id: te.id,
      exerciseId: te.exerciseId,
      orderIndex: te.orderIndex,
      targetSets: te.targetSets,
      targetReps: te.targetReps,
      targetWeight: te.targetWeight,
      exercise: {
        id: te.exercise.id,
        name: te.exercise.name,
        category: te.exercise.category,
        primaryMuscleGroup: te.exercise.primaryMuscleGroup,
      },
    })),
  };
}

export async function createTemplate(formData: FormData) {
  const session = await verifySession();
  const name = formData.get("name") as string;
  if (!name?.trim()) return { error: "Name is required." };

  const [template] = await db
    .insert(workoutTemplates)
    .values({
      userId: session.userId,
      name: name.trim(),
    })
    .returning();

  revalidatePath("/app/workouts/templates");
  return { templateId: template.id };
}

export async function deleteTemplate(templateId: number) {
  const session = await verifySession();

  await db
    .delete(workoutTemplates)
    .where(
      and(
        eq(workoutTemplates.id, templateId),
        eq(workoutTemplates.userId, session.userId)
      )
    );

  revalidatePath("/app/workouts/templates");
  return { success: true };
}

export async function addTemplateExercise(
  templateId: number,
  exerciseId: number,
  orderIndex: number
) {
  const session = await verifySession();

  // Verify template ownership
  const template = await db.query.workoutTemplates.findFirst({
    where: and(
      eq(workoutTemplates.id, templateId),
      eq(workoutTemplates.userId, session.userId)
    ),
  });
  if (!template) return { error: "Template not found." };

  await db.insert(workoutTemplateExercises).values({
    templateId,
    exerciseId,
    orderIndex,
    targetSets: 3,
  });

  revalidatePath(`/app/workouts/templates/${templateId}`);
  return { success: true };
}

export async function updateTemplateExercise(id: number, formData: FormData) {
  const session = await verifySession();

  // Verify ownership via join
  const te = await db.query.workoutTemplateExercises.findFirst({
    where: eq(workoutTemplateExercises.id, id),
    with: { template: true },
  });
  if (!te || te.template.userId !== session.userId) {
    return { error: "Not found." };
  }

  const targetSets = formData.get("targetSets");
  const targetReps = formData.get("targetReps");
  const targetWeight = formData.get("targetWeight");

  await db
    .update(workoutTemplateExercises)
    .set({
      targetSets: targetSets ? Number(targetSets) : te.targetSets,
      targetReps: targetReps ? String(targetReps) : te.targetReps,
      targetWeight: targetWeight ? Number(targetWeight) : te.targetWeight,
    })
    .where(eq(workoutTemplateExercises.id, id));

  revalidatePath(`/app/workouts/templates/${te.templateId}`);
  return { success: true };
}

export async function removeTemplateExercise(id: number) {
  const session = await verifySession();

  const te = await db.query.workoutTemplateExercises.findFirst({
    where: eq(workoutTemplateExercises.id, id),
    with: { template: true },
  });
  if (!te || te.template.userId !== session.userId) {
    return { error: "Not found." };
  }

  await db
    .delete(workoutTemplateExercises)
    .where(eq(workoutTemplateExercises.id, id));

  revalidatePath(`/app/workouts/templates/${te.templateId}`);
  return { success: true };
}

export async function moveTemplateExercise(
  templateId: number,
  exerciseEntryId: number,
  direction: "up" | "down"
) {
  const session = await verifySession();

  const template = await db.query.workoutTemplates.findFirst({
    where: and(
      eq(workoutTemplates.id, templateId),
      eq(workoutTemplates.userId, session.userId)
    ),
    with: {
      exercises: {
        orderBy: [asc(workoutTemplateExercises.orderIndex)],
      },
    },
  });

  if (!template) return { error: "Template not found." };

  const entries = template.exercises;
  const idx = entries.findIndex((e) => e.id === exerciseEntryId);
  if (idx === -1) return { error: "Exercise not found." };

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= entries.length) return { error: "Cannot move." };

  const current = entries[idx];
  const swap = entries[swapIdx];

  await db
    .update(workoutTemplateExercises)
    .set({ orderIndex: swap.orderIndex })
    .where(eq(workoutTemplateExercises.id, current.id));

  await db
    .update(workoutTemplateExercises)
    .set({ orderIndex: current.orderIndex })
    .where(eq(workoutTemplateExercises.id, swap.id));

  revalidatePath(`/app/workouts/templates/${templateId}`);
  return { success: true };
}

export async function getAllExercises() {
  const allExercises = await db.query.exercises.findMany({
    orderBy: (exercises, { asc }) => [
      asc(exercises.primaryMuscleGroup),
      asc(exercises.name),
    ],
  });
  return allExercises;
}
