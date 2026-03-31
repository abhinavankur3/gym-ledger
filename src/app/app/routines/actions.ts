"use server";

import { eq, and, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import {
  routines,
  routineDays,
  workoutTemplates,
  workoutTemplateExercises,
} from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/dal";

export async function getRoutines() {
  const session = await verifySession();

  const userRoutines = await db.query.routines.findMany({
    where: eq(routines.userId, session.userId),
    with: {
      days: {
        with: {
          template: true,
        },
      },
    },
    orderBy: [asc(routines.name)],
  });

  return userRoutines.map((r) => ({
    id: r.id,
    name: r.name,
    isActive: r.isActive,
    days: r.days.map((d) => ({
      id: d.id,
      dayOfWeek: d.dayOfWeek,
      templateId: d.templateId,
      templateName: d.template.name,
    })),
  }));
}

export async function getActiveRoutine() {
  const session = await verifySession();

  const routine = await db.query.routines.findFirst({
    where: and(
      eq(routines.userId, session.userId),
      eq(routines.isActive, true)
    ),
    with: {
      days: {
        with: {
          template: true,
        },
      },
    },
  });

  if (!routine) return null;

  return {
    id: routine.id,
    name: routine.name,
    isActive: routine.isActive,
    days: routine.days.map((d) => ({
      id: d.id,
      dayOfWeek: d.dayOfWeek,
      templateId: d.templateId,
      templateName: d.template.name,
    })),
  };
}

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

  // Convert JS day (0=Sun) to our format (0=Mon...6=Sun)
  const jsDow = new Date().getDay();
  const dayOfWeek = (jsDow + 6) % 7;

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

export async function createRoutine(formData: FormData) {
  const session = await verifySession();
  const name = formData.get("name") as string;
  if (!name?.trim()) return { error: "Name is required." };

  const [routine] = await db
    .insert(routines)
    .values({
      userId: session.userId,
      name: name.trim(),
    })
    .returning();

  revalidatePath("/app/routines");
  return { routineId: routine.id };
}

export async function deleteRoutine(routineId: number) {
  const session = await verifySession();

  await db
    .delete(routines)
    .where(
      and(eq(routines.id, routineId), eq(routines.userId, session.userId))
    );

  revalidatePath("/app/routines");
  revalidatePath("/app");
  return { success: true };
}

export async function setActiveRoutine(routineId: number) {
  const session = await verifySession();

  // Deactivate all user routines
  await db
    .update(routines)
    .set({ isActive: false })
    .where(eq(routines.userId, session.userId));

  // Activate the selected one
  await db
    .update(routines)
    .set({ isActive: true })
    .where(
      and(eq(routines.id, routineId), eq(routines.userId, session.userId))
    );

  revalidatePath("/app/routines");
  revalidatePath("/app");
  return { success: true };
}

export async function assignTemplateToDay(
  routineId: number,
  dayOfWeek: number,
  templateId: number
) {
  const session = await verifySession();

  // Verify routine ownership
  const routine = await db.query.routines.findFirst({
    where: and(
      eq(routines.id, routineId),
      eq(routines.userId, session.userId)
    ),
  });
  if (!routine) return { error: "Routine not found." };

  // Delete existing entry for this day
  const existingDays = await db.query.routineDays.findMany({
    where: and(
      eq(routineDays.routineId, routineId),
      eq(routineDays.dayOfWeek, dayOfWeek)
    ),
  });
  for (const d of existingDays) {
    await db.delete(routineDays).where(eq(routineDays.id, d.id));
  }

  // Insert new
  await db.insert(routineDays).values({
    routineId,
    dayOfWeek,
    templateId,
  });

  revalidatePath(`/app/routines/${routineId}`);
  revalidatePath("/app/routines");
  revalidatePath("/app");
  return { success: true };
}

export async function removeTemplateFromDay(
  routineId: number,
  dayOfWeek: number
) {
  const session = await verifySession();

  const routine = await db.query.routines.findFirst({
    where: and(
      eq(routines.id, routineId),
      eq(routines.userId, session.userId)
    ),
  });
  if (!routine) return { error: "Routine not found." };

  const existingDays = await db.query.routineDays.findMany({
    where: and(
      eq(routineDays.routineId, routineId),
      eq(routineDays.dayOfWeek, dayOfWeek)
    ),
  });
  for (const d of existingDays) {
    await db.delete(routineDays).where(eq(routineDays.id, d.id));
  }

  revalidatePath(`/app/routines/${routineId}`);
  revalidatePath("/app/routines");
  revalidatePath("/app");
  return { success: true };
}
