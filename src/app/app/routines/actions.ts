"use server";

import { eq, and, asc } from "drizzle-orm";
import db from "@/lib/db";
import { routines, workoutTemplateExercises } from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/dal";
import { getUserTimeZone, localWeekday } from "@/lib/dates";

// Routines are generated from the user's plan; the manual routine editor and its
// actions were removed. Only the reads used by Home remain.

export async function getTodayTemplate() {
  const session = await verifySession();

  const activeRoutine = await db.query.routines.findFirst({
    where: and(
      eq(routines.userId, session.userId),
      eq(routines.isActive, true)
    ),
    with: {
      days: {
        with: {
          template: {
            with: {
              exercises: {
                with: {
                  exercise: true,
                },
                orderBy: [asc(workoutTemplateExercises.orderIndex)],
              },
            },
          },
        },
      },
    },
  });

  if (!activeRoutine) return null;

  // 0=Mon...6=Sun, in the user's own time zone
  const dayOfWeek = localWeekday(new Date(), await getUserTimeZone());

  const todayDay = activeRoutine.days.find((d) => d.dayOfWeek === dayOfWeek);
  if (!todayDay) return null;

  const t = todayDay.template;
  return {
    id: t.id,
    name: t.name,
    exercises: t.exercises.map((te) => ({
      exerciseId: te.exerciseId,
      name: te.exercise.name,
      primaryMuscleGroup: te.exercise.primaryMuscleGroup,
      targetSets: te.targetSets,
      targetReps: te.targetReps,
      targetWeight: te.targetWeight,
    })),
  };
}

/** The active routine's training days (0 = Monday), for the weekly bar and rest-day messaging. */
export async function getRoutineWeek() {
  const session = await verifySession();

  const activeRoutine = await db.query.routines.findFirst({
    where: and(eq(routines.userId, session.userId), eq(routines.isActive, true)),
    with: { days: { with: { template: { columns: { name: true } } } } },
  });
  if (!activeRoutine) return [];

  return activeRoutine.days
    .map((d) => ({ dayOfWeek: d.dayOfWeek, name: d.template.name }))
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}
