export const MUSCLE_GROUPS = ["chest", "back", "shoulders", "biceps", "triceps", "forearms", "quads", "hamstrings", "glutes", "calves", "core", "full_body"] as const;
export const EXERCISE_CATEGORIES = ["barbell", "dumbbell", "machine", "cable", "bodyweight", "cardio", "other"] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];
export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export type PlanExercise = {
  /** Any clear exercise name; matched to the library by name when it already exists */
  exercise: string;
  sets: number;
  reps: string;
  rir: number;
  muscle?: MuscleGroup;
  category?: ExerciseCategory;
};

export type Plan = {
  name: string;
  days: Array<{
    name: string;
    exercises: PlanExercise[];
  }>;
};

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Spreads N training days across the week with rest days between them (0 = Monday). */
export function trainingWeekdays(count: number): number[] {
  const layouts: Record<number, number[]> = {
    1: [0],
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 2, 4, 5],
    6: [0, 1, 2, 3, 4, 5],
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  return layouts[Math.min(Math.max(count, 1), 7)];
}
