"use server";

import { eq, and, desc, asc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import {
  workouts,
  workoutSets,
  exercises,
  workoutTemplates,
  workoutTemplateExercises,
} from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/dal";

export async function startWorkout(name: string) {
  const session = await verifySession();

  const [workout] = await db
    .insert(workouts)
    .values({
      userId: session.userId,
      name,
      startedAt: new Date().toISOString(),
    })
    .returning();

  revalidatePath("/app/workouts");
  return { workoutId: workout.id };
}

export async function addSet(
  workoutId: number,
  exerciseId: number,
  data: {
    setNumber: number;
    setType: "warmup" | "working" | "dropset" | "failure";
    reps?: number;
    weight?: number;
    rpe?: number;
  }
) {
  const session = await verifySession();

  // Verify workout belongs to user
  const workout = await db.query.workouts.findFirst({
    where: and(
      eq(workouts.id, workoutId),
      eq(workouts.userId, session.userId)
    ),
  });

  if (!workout) return { error: "Workout not found." };

  // Check if this is a PR (highest weight for this exercise by this user)
  let isPr = false;
  if (data.weight && data.reps) {
    const maxWeight = await db
      .select({ maxWeight: sql<number>`MAX(${workoutSets.weight})` })
      .from(workoutSets)
      .innerJoin(workouts, eq(workoutSets.workoutId, workouts.id))
      .where(
        and(
          eq(workouts.userId, session.userId),
          eq(workoutSets.exerciseId, exerciseId),
          sql`${workoutSets.reps} >= ${data.reps}`
        )
      );

    isPr = !maxWeight[0]?.maxWeight || data.weight > maxWeight[0].maxWeight;
  }

  await db.insert(workoutSets).values({
    workoutId,
    exerciseId,
    setNumber: data.setNumber,
    setType: data.setType,
    reps: data.reps ?? null,
    weight: data.weight ?? null,
    rpe: data.rpe ?? null,
    isPr,
    completedAt: new Date().toISOString(),
  });

  revalidatePath(`/app/workouts/${workoutId}`);
  return { success: true, isPr };
}

export async function deleteSet(setId: number) {
  const session = await verifySession();

  const set = await db.query.workoutSets.findFirst({
    where: eq(workoutSets.id, setId),
  });

  if (!set) return { error: "Set not found." };

  // Verify ownership
  const workout = await db.query.workouts.findFirst({
    where: and(
      eq(workouts.id, set.workoutId),
      eq(workouts.userId, session.userId)
    ),
  });

  if (!workout) return { error: "Not authorized." };

  await db.delete(workoutSets).where(eq(workoutSets.id, setId));
  revalidatePath(`/app/workouts/${set.workoutId}`);
  return { success: true };
}

export async function completeWorkout(workoutId: number) {
  const session = await verifySession();

  await db
    .update(workouts)
    .set({ completedAt: new Date().toISOString() })
    .where(
      and(eq(workouts.id, workoutId), eq(workouts.userId, session.userId))
    );

  revalidatePath("/app/workouts");
  revalidatePath("/app");
  return { success: true };
}

export async function getWorkoutHistory() {
  const session = await verifySession();

  const userWorkouts = await db.query.workouts.findMany({
    where: eq(workouts.userId, session.userId),
    orderBy: [desc(workouts.startedAt)],
    limit: 50,
  });

  // Get set counts for each workout
  const workoutsWithSets = await Promise.all(
    userWorkouts.map(async (w) => {
      const sets = await db.query.workoutSets.findMany({
        where: eq(workoutSets.workoutId, w.id),
      });

      const exerciseIds = [...new Set(sets.map((s) => s.exerciseId))];
      const exerciseDetails = await Promise.all(
        exerciseIds.map((id) =>
          db.query.exercises.findFirst({ where: eq(exercises.id, id) })
        )
      );

      const totalVolume = sets.reduce(
        (acc, s) => acc + (s.weight ?? 0) * (s.reps ?? 0),
        0
      );

      const muscleGroups = [
        ...new Set(exerciseDetails.filter(Boolean).map((e) => e!.primaryMuscleGroup)),
      ];

      return {
        ...w,
        setCount: sets.length,
        exerciseCount: exerciseIds.length,
        totalVolume,
        muscleGroups,
      };
    })
  );

  return workoutsWithSets;
}

export async function startWorkoutFromTemplate(templateId: number) {
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

  if (!template) return { error: "Template not found." };

  const [workout] = await db
    .insert(workouts)
    .values({
      userId: session.userId,
      name: template.name,
      templateId: template.id,
      startedAt: new Date().toISOString(),
    })
    .returning();

  revalidatePath("/app/workouts");

  return {
    workoutId: workout.id,
    templateExercises: template.exercises.map((te) => ({
      exerciseId: te.exerciseId,
      name: te.exercise.name,
      primaryMuscleGroup: te.exercise.primaryMuscleGroup,
      targetSets: te.targetSets,
      targetReps: te.targetReps,
      targetWeight: te.targetWeight,
    })),
  };
}

export async function deleteWorkout(workoutId: number) {
  const session = await verifySession();

  await db
    .delete(workouts)
    .where(
      and(eq(workouts.id, workoutId), eq(workouts.userId, session.userId))
    );

  revalidatePath("/app/workouts");
  return { success: true };
}
