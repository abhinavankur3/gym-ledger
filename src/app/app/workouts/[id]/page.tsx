import { eq, and, asc, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import {
  workouts,
  workoutSets,
  exercises,
  workoutTemplates,
  workoutTemplateExercises,
} from "@/lib/db/schema";
import { ActiveWorkout } from "./active-workout";
import { getLastPerformance } from "../actions";
import { visibleExercises } from "@/lib/exercises";
import { getUserTimeZone } from "@/lib/dates";

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  const workout = await db.query.workouts.findFirst({
    where: and(
      eq(workouts.id, Number(id)),
      eq(workouts.userId, user.id)
    ),
  });

  if (!workout) redirect("/app/workouts");

  const sets = await db.query.workoutSets.findMany({
    where: eq(workoutSets.workoutId, workout.id),
    orderBy: (sets, { asc }) => [asc(sets.exerciseId), asc(sets.setNumber)],
  });

  // Get exercise details for all exercises used in this workout
  const exerciseIds = [...new Set(sets.map((s) => s.exerciseId))];
  const exerciseList = exerciseIds.length
    ? await db.query.exercises.findMany({ where: inArray(exercises.id, exerciseIds) })
    : [];
  const exerciseMap = Object.fromEntries(exerciseList.map((e) => [e.id, e]));

  // Exercises the user can pick: the built-in library plus their own
  const allExercises = await db.query.exercises.findMany({
    where: visibleExercises(user.id),
    orderBy: (exercises, { asc }) => [asc(exercises.primaryMuscleGroup), asc(exercises.name)],
  });

  // Group sets by exercise
  const setsByExercise: Record<
    number,
    typeof sets
  > = {};
  for (const set of sets) {
    if (!setsByExercise[set.exerciseId]) setsByExercise[set.exerciseId] = [];
    setsByExercise[set.exerciseId].push(set);
  }

  // Fetch template exercises if workout has a templateId
  let templateExercises: Array<{
    exerciseId: number;
    name: string;
    category: string;
    primaryMuscleGroup: string;
    targetSets: number | null;
    targetReps: string | null;
    targetWeight: number | null;
  }> | undefined;

  if (workout.templateId) {
    const template = await db.query.workoutTemplates.findFirst({
      where: eq(workoutTemplates.id, workout.templateId),
      with: {
        exercises: {
          with: {
            exercise: true,
          },
          orderBy: [asc(workoutTemplateExercises.orderIndex)],
        },
      },
    });

    if (template) {
      templateExercises = template.exercises.map((te) => ({
        exerciseId: te.exerciseId,
        name: te.exercise.name,
        category: te.exercise.category,
        primaryMuscleGroup: te.exercise.primaryMuscleGroup,
        targetSets: te.targetSets,
        targetReps: te.targetReps,
        targetWeight: te.targetWeight,
      }));
    }
  }

  const lastPerformance = await getLastPerformance(
    [...new Set([...exerciseIds, ...(templateExercises ?? []).map((t) => t.exerciseId)])],
    workout.id
  );

  return (
    <ActiveWorkout
      workout={workout}
      setsByExercise={setsByExercise}
      exerciseMap={exerciseMap}
      allExercises={allExercises}
      templateExercises={templateExercises}
      lastPerformance={lastPerformance}
      dateLabel={new Intl.DateTimeFormat("en-GB", { timeZone: await getUserTimeZone(), weekday: "long", day: "numeric", month: "short" }).format(new Date(workout.startedAt))}
    />
  );
}
