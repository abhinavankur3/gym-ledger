"use server";

import { eq, and, desc, asc, sql, inArray, lt, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isNull } from "drizzle-orm";
import db from "@/lib/db";
import {
  workouts,
  workoutSets,
  exercises,
  workoutTemplates,
  workoutTemplateExercises,
} from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/dal";
import { visibleExercises } from "@/lib/exercises";
import { getUserTimeZone, startOfLocalDayIso } from "@/lib/dates";

export async function startWorkout(name: string) {
  const session = await verifySession();
  const cleanName = typeof name === "string" ? name.replace(/\s+/g, " ").trim().slice(0, 80) : "";
  if (!cleanName) return { error: "Give the workout a name." };

  const [workout] = await db
    .insert(workouts)
    .values({
      userId: session.userId,
      name: cleanName,
      startedAt: new Date().toISOString(),
    })
    .returning();

  revalidatePath("/app/workouts");
  return { workoutId: workout.id };
}

const SET_TYPES = ["warmup", "working", "dropset", "failure"] as const;

/** Finite number within [min, max], or undefined when absent. Anything else is invalid. */
function inRange(value: unknown, min: number, max: number): number | undefined | null {
  if (value === undefined || value === null) return undefined;
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max ? value : null;
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
    durationSeconds?: number;
  }
) {
  const session = await verifySession();

  // Server actions are public endpoints: validate everything the client sends
  const setNumber = inRange(data?.setNumber, 1, 50);
  const reps = inRange(data?.reps, 0, 200);
  const weight = inRange(data?.weight, 0, 1000);
  const durationSeconds = inRange(data?.durationSeconds, 0, 36000);
  const rpe = inRange(data?.rpe, 1, 10);
  if (
    !Number.isInteger(workoutId) ||
    !Number.isInteger(exerciseId) ||
    !SET_TYPES.includes(data?.setType) ||
    !setNumber ||
    !Number.isInteger(setNumber) ||
    reps === null ||
    weight === null ||
    durationSeconds === null ||
    rpe === null
  ) {
    return { error: "That set doesn't look right. Check the numbers and try again." };
  }

  // Verify workout belongs to user and is still open
  const workout = await db.query.workouts.findFirst({
    where: and(
      eq(workouts.id, workoutId),
      eq(workouts.userId, session.userId)
    ),
  });

  if (!workout) return { error: "Workout not found." };
  if (workout.completedAt) return { error: "This workout is finished. Start a new one to log more sets." };

  const exercise = await db.query.exercises.findFirst({
    where: and(eq(exercises.id, exerciseId), visibleExercises(session.userId)),
    columns: { id: true },
  });
  if (!exercise) return { error: "Exercise not found." };

  // PR: heavier than every earlier non-warm-up set at the same or more reps.
  // The very first time an exercise is logged isn't a PR (there's nothing to beat).
  let isPr = false;
  if (weight && reps && data.setType !== "warmup") {
    const [prior] = await db
      .select({
        count: sql<number>`COUNT(*)`,
        maxWeight: sql<number | null>`MAX(CASE WHEN ${workoutSets.reps} >= ${reps} THEN ${workoutSets.weight} END)`,
      })
      .from(workoutSets)
      .innerJoin(workouts, eq(workoutSets.workoutId, workouts.id))
      .where(
        and(
          eq(workouts.userId, session.userId),
          eq(workoutSets.exerciseId, exerciseId),
          ne(workoutSets.setType, "warmup")
        )
      );

    isPr = (prior?.count ?? 0) > 0 && (prior?.maxWeight == null || weight > prior.maxWeight);
  }

  await db.insert(workoutSets).values({
    workoutId,
    exerciseId,
    setNumber,
    setType: data.setType,
    reps: reps ?? null,
    weight: weight ?? null,
    durationSeconds: durationSeconds ?? null,
    rpe: rpe ?? null,
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

export async function removeExerciseFromWorkout(
  workoutId: number,
  exerciseId: number
) {
  const session = await verifySession();

  const workout = await db.query.workouts.findFirst({
    where: and(
      eq(workouts.id, workoutId),
      eq(workouts.userId, session.userId)
    ),
  });

  if (!workout) return { error: "Workout not found." };

  await db
    .delete(workoutSets)
    .where(
      and(
        eq(workoutSets.workoutId, workoutId),
        eq(workoutSets.exerciseId, exerciseId)
      )
    );

  revalidatePath(`/app/workouts/${workoutId}`);
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

  // One query for all sets (with each exercise's muscle) instead of a query per workout and per exercise
  const ids = userWorkouts.map((w) => w.id);
  const sets = ids.length
    ? await db
        .select({ workoutId: workoutSets.workoutId, exerciseId: workoutSets.exerciseId, weight: workoutSets.weight, reps: workoutSets.reps, muscle: exercises.primaryMuscleGroup })
        .from(workoutSets)
        .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
        .where(inArray(workoutSets.workoutId, ids))
    : [];

  const workoutsWithSets = userWorkouts.map((w) => {
    const own = sets.filter((s) => s.workoutId === w.id);
    return {
      ...w,
      setCount: own.length,
      exerciseCount: new Set(own.map((s) => s.exerciseId)).size,
      totalVolume: own.reduce((acc, s) => acc + (s.weight ?? 0) * (s.reps ?? 0), 0),
      muscleGroups: [...new Set(own.map((s) => s.muscle))],
    };
  });

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

/**
 * Working sets from the most recent earlier workout that included each exercise.
 * Feeds one-tap set suggestions.
 */
export async function getLastPerformance(exerciseIds: number[], currentWorkoutId: number) {
  const session = await verifySession();
  if (exerciseIds.length === 0) return {};

  const current = await db.query.workouts.findFirst({
    where: and(eq(workouts.id, currentWorkoutId), eq(workouts.userId, session.userId)),
    columns: { startedAt: true },
  });
  if (!current) return {};

  const rows = await db
    .select({
      workoutId: workoutSets.workoutId,
      exerciseId: workoutSets.exerciseId,
      setNumber: workoutSets.setNumber,
      setType: workoutSets.setType,
      weight: workoutSets.weight,
      reps: workoutSets.reps,
      durationSeconds: workoutSets.durationSeconds,
    })
    .from(workoutSets)
    .innerJoin(workouts, eq(workoutSets.workoutId, workouts.id))
    .where(
      and(
        eq(workouts.userId, session.userId),
        ne(workouts.id, currentWorkoutId),
        lt(workouts.startedAt, current.startedAt),
        inArray(workoutSets.exerciseId, exerciseIds),
        ne(workoutSets.setType, "warmup")
      )
    )
    .orderBy(desc(workouts.startedAt), asc(workoutSets.setNumber));

  const byExercise: Record<number, typeof rows> = {};
  const sessionFor: Record<number, number> = {};
  for (const row of rows) {
    sessionFor[row.exerciseId] ??= row.workoutId;
    if (row.workoutId !== sessionFor[row.exerciseId]) continue;
    (byExercise[row.exerciseId] ??= []).push(row);
  }
  return byExercise;
}

/**
 * One-tap start from Home: opens an unfinished session of this template started
 * since local midnight if there is one (same rule Home uses for "Resume"),
 * otherwise creates it, then goes straight to logging.
 */
export async function startOrResumeSession(templateId: number) {
  const session = await verifySession();

  const template = await db.query.workoutTemplates.findFirst({
    where: and(eq(workoutTemplates.id, templateId), eq(workoutTemplates.userId, session.userId)),
    columns: { id: true, name: true },
  });
  if (!template) redirect("/app/workouts/new");

  const since = startOfLocalDayIso(new Date(), await getUserTimeZone());
  const open = await db.query.workouts.findFirst({
    where: and(
      eq(workouts.userId, session.userId),
      eq(workouts.templateId, template.id),
      isNull(workouts.completedAt),
      sql`${workouts.startedAt} >= ${since}`
    ),
    orderBy: [desc(workouts.startedAt)],
    columns: { id: true },
  });

  const workoutId =
    open?.id ??
    (await db.insert(workouts).values({ userId: session.userId, name: template.name, templateId: template.id, startedAt: new Date().toISOString() }).returning({ id: workouts.id }))[0].id;

  revalidatePath("/app");
  revalidatePath("/app/workouts");
  redirect(`/app/workouts/${workoutId}`);
}
