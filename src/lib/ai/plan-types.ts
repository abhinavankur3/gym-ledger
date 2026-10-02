export type PlanExercise = {
  exercise: string;
  sets: number;
  reps: string;
  rir: number;
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
