import { eq, and } from "drizzle-orm";
import { redirect } from "next/navigation";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { workouts, workoutSets, exercises } from "@/lib/db/schema";
import { ActiveWorkout } from "./active-workout";

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
  const exerciseList = await Promise.all(
    exerciseIds.map((id) =>
      db.query.exercises.findFirst({ where: eq(exercises.id, id) })
    )
  );
  const exerciseMap = Object.fromEntries(
    exerciseList.filter(Boolean).map((e) => [e!.id, e!])
  );

  // Get all exercises for the picker
  const allExercises = await db.query.exercises.findMany({
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

  return (
    <ActiveWorkout
      workout={workout}
      setsByExercise={setsByExercise}
      exerciseMap={exerciseMap}
      allExercises={allExercises}
    />
  );
}
