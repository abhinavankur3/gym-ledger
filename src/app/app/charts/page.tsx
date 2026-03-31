import { eq, desc, and, gte } from "drizzle-orm";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import {
  bodyMetrics,
  workoutSets,
  workouts,
  exercises,
  gymAttendance,
} from "@/lib/db/schema";
import { BlurFade } from "@/components/ui/blur-fade";
import { ChartsClient } from "./charts-client";

export default async function ChartsPage() {
  const user = await getCurrentUser();

  // Weight data (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const weightData = await db.query.bodyMetrics.findMany({
    where: and(
      eq(bodyMetrics.userId, user.id),
      eq(bodyMetrics.metricType, "weight"),
      gte(bodyMetrics.date, sixMonthsAgo.toISOString().split("T")[0])
    ),
    orderBy: (m, { asc }) => [asc(m.date)],
  });

  // Attendance data (last year)
  const yearAgo = new Date();
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const attendanceData = await db.query.gymAttendance.findMany({
    where: and(
      eq(gymAttendance.userId, user.id),
      gte(gymAttendance.checkIn, yearAgo.toISOString())
    ),
    orderBy: (a, { asc }) => [asc(a.checkIn)],
  });

  // Volume data (last 4 weeks) - get all sets with exercise info
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const recentWorkouts = await db.query.workouts.findMany({
    where: and(
      eq(workouts.userId, user.id),
      gte(workouts.startedAt, fourWeeksAgo.toISOString())
    ),
  });

  const volumeByMuscle: Record<string, number> = {};
  for (const workout of recentWorkouts) {
    const sets = await db.query.workoutSets.findMany({
      where: eq(workoutSets.workoutId, workout.id),
    });
    for (const set of sets) {
      const exercise = await db.query.exercises.findFirst({
        where: eq(exercises.id, set.exerciseId),
      });
      if (exercise && set.weight && set.reps) {
        const mg = exercise.primaryMuscleGroup;
        volumeByMuscle[mg] = (volumeByMuscle[mg] || 0) + set.weight * set.reps;
      }
    }
  }

  const volumeData = Object.entries(volumeByMuscle)
    .map(([muscle, volume]) => ({ muscle: muscle.replace("_", " "), volume: Math.round(volume) }))
    .sort((a, b) => b.volume - a.volume);

  // All exercises for PR chart
  const allExercises = await db.query.exercises.findMany({
    orderBy: (e, { asc }) => [asc(e.name)],
  });

  // PR data for all exercises
  const prData: Record<number, { date: string; weight: number }[]> = {};
  const userWorkouts = await db.query.workouts.findMany({
    where: eq(workouts.userId, user.id),
  });
  const workoutIds = userWorkouts.map((w) => w.id);

  if (workoutIds.length > 0) {
    const allSets = await db.query.workoutSets.findMany({
      where: eq(workoutSets.isPr, true),
    });

    for (const set of allSets) {
      if (!workoutIds.includes(set.workoutId)) continue;
      if (!set.weight) continue;
      const workout = userWorkouts.find((w) => w.id === set.workoutId);
      if (!workout) continue;
      if (!prData[set.exerciseId]) prData[set.exerciseId] = [];
      prData[set.exerciseId].push({
        date: workout.startedAt.split("T")[0],
        weight: set.weight,
      });
    }
  }

  return (
    <div className="px-4 pt-8">
      <BlurFade delay={0}>
        <h1 className="text-2xl font-bold tracking-tight">Charts</h1>
      </BlurFade>

      <BlurFade delay={0.1}>
        <ChartsClient
          weightData={weightData.map((w) => ({ date: w.date, value: w.value, unit: w.unit }))}
          attendanceData={attendanceData.map((a) => ({ date: a.checkIn.split("T")[0] }))}
          volumeData={volumeData}
          exercises={allExercises.map((e) => ({ id: e.id, name: e.name }))}
          prData={prData}
        />
      </BlurFade>
    </div>
  );
}
