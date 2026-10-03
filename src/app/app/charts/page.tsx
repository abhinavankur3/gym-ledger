import { eq, and, gte } from "drizzle-orm";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import {
  bodyMetrics,
  workoutSets,
  workouts,
  exercises,
  gymAttendance,
} from "@/lib/db/schema";
import { PageHeader } from "@/components/layout/page-header";
import { ChartsClient } from "./charts-client";
import Link from "next/link";
import { CalendarCheck, ChevronRight, Plus, Ruler } from "lucide-react";
import { getUserTimeZone, localDateKey } from "@/lib/dates";

export default async function ChartsPage() {
  const user = await getCurrentUser();
  const tz = await getUserTimeZone();

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

  // Volume data (last 4 weeks): one joined query instead of a query per workout and per set
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  const recentSets = await db
    .select({ weight: workoutSets.weight, reps: workoutSets.reps, muscle: exercises.primaryMuscleGroup })
    .from(workoutSets)
    .innerJoin(workouts, eq(workoutSets.workoutId, workouts.id))
    .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
    .where(and(eq(workouts.userId, user.id), gte(workouts.startedAt, fourWeeksAgo.toISOString())));

  const volumeByMuscle: Record<string, number> = {};
  for (const set of recentSets) {
    if (set.weight && set.reps) volumeByMuscle[set.muscle] = (volumeByMuscle[set.muscle] || 0) + set.weight * set.reps;
  }

  const volumeData = Object.entries(volumeByMuscle)
    .map(([muscle, volume]) => ({ muscle: muscle.replace("_", " "), volume: Math.round(volume) }))
    .sort((a, b) => b.volume - a.volume);

  // PR history: only this user's PR sets, with exercise names, in one query
  const prSets = await db
    .select({ exerciseId: workoutSets.exerciseId, exerciseName: exercises.name, weight: workoutSets.weight, startedAt: workouts.startedAt })
    .from(workoutSets)
    .innerJoin(workouts, eq(workoutSets.workoutId, workouts.id))
    .innerJoin(exercises, eq(workoutSets.exerciseId, exercises.id))
    .where(and(eq(workouts.userId, user.id), eq(workoutSets.isPr, true)));

  const byExercise = new Map<number, { name: string; history: Array<{ date: string; weight: number }> }>();
  for (const set of prSets) {
    if (!set.weight) continue;
    const entry = byExercise.get(set.exerciseId) ?? { name: set.exerciseName, history: [] };
    entry.history.push({ date: localDateKey(set.startedAt, tz), weight: set.weight });
    byExercise.set(set.exerciseId, entry);
  }

  const prExercises = [...byExercise.entries()]
    .map(([exerciseId, { name, history }]) => {
      const sorted = history.sort((a, b) => a.date.localeCompare(b.date));
      const best = sorted.reduce((max, h) => (h.weight > max.weight ? h : max), sorted[0]);
      return { exerciseId, exerciseName: name, bestWeight: best.weight, bestDate: best.date, history: sorted };
    })
    .sort((a, b) => b.bestWeight - a.bestWeight);

  return (
    <main className="pb-6">
      <PageHeader
        title="Progress"
        subtitle="Weight, volume, attendance and records"
        action={
          <Link href="/app/metrics" className="inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-2xl bg-card px-4 text-sm font-semibold text-primary shadow-soft hover:bg-muted">
            <Plus className="h-4 w-4" /> Log weight
          </Link>
        }
      />

      <ChartsClient
        weightData={weightData.map((w) => ({ date: w.date, value: w.value, unit: w.unit }))}
        attendanceData={attendanceData.filter((a) => a.checkIn).map((a) => ({ date: localDateKey(a.checkIn, tz) }))}
        today={localDateKey(new Date(), tz)}
        volumeData={volumeData}
        prExercises={prExercises}
      />

      <nav aria-label="Progress records" className="mt-3 divide-y divide-border overflow-hidden rounded-3xl bg-card shadow-soft dark:ring-1 dark:ring-white/5">
        <Link href="/app/metrics" className="flex items-center gap-3 p-4 hover:bg-muted/50">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pull/15 text-pull"><Ruler className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><span className="block font-semibold">Body metrics</span><span className="block text-sm text-muted-foreground">Weight, body fat and measurements</span></span>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>
        <Link href="/app/attendance" className="flex items-center gap-3 p-4 hover:bg-muted/50">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-legs/15 text-legs"><CalendarCheck className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1"><span className="block font-semibold">Attendance</span><span className="block text-sm text-muted-foreground">Check-ins, calendar and streak</span></span>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </Link>
      </nav>
    </main>
  );
}
