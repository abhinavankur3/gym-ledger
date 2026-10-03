"use server";

import { eq, asc } from "drizzle-orm";
import db from "@/lib/db";
import { workoutTemplates } from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/dal";

// Templates are generated from the user's plan; the manual template editor and its
// actions were removed. Only the read used by "New workout" remains.
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
