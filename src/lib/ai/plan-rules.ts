/**
 * Pure plan rules: validating a model's plan against the catalog and schedule,
 * and the deterministic fallback plan. No database or network access, so it's
 * unit-tested directly.
 */
import type { Plan } from "@/lib/ai/plan-types";

export type Profile = {
  goal: "lose_fat" | "build_muscle" | "recomposition" | "general_fitness";
  experience: "beginner" | "intermediate" | "advanced";
  age: number;
  sex: string;
  height: number;
  weight: number;
  activityLevel: "sedentary" | "light" | "moderate" | "very_active";
  trainingDays: number;
  sessionDuration: number;
  equipment: string;
  dietaryPreferences: string;
  restrictions?: string | null;
  avoidMovements?: string | null;
};

/** The exercise fields plan rules need (a subset of the exercises table row). */
export type ExerciseRecord = { id: number; name: string; category: string; primaryMuscleGroup: string };

export const goalLabels = {
  lose_fat: "fat loss",
  build_muscle: "muscle gain",
  recomposition: "body recomposition",
  general_fitness: "general fitness",
} as const;

export function resolvePlan(plan: Plan, available: ExerciseRecord[], profile: Profile): Plan {
  const byName = new Map(available.map((exercise) => [exercise.name.toLowerCase(), exercise.name]));
  const fallback = deterministicPlan(profile, available);
  const validDays = plan.days.map((day) => ({
    ...day,
    exercises: day.exercises.filter((item) => byName.has(item.exercise.toLowerCase())).map((item) => ({ ...item, exercise: byName.get(item.exercise.toLowerCase())! })),
  })).filter((day) => day.exercises.length >= 2);
  if (validDays.length < 2) return fallback;

  // Models can return a plausible split with the wrong number of days. Keep
  // the useful generated days, then fill or trim against the onboarding
  // contract so the persisted routine always matches the user's schedule.
  const days = validDays.slice(0, profile.trainingDays);
  for (const fallbackDay of fallback.days) {
    if (days.length >= profile.trainingDays) break;
    days.push(fallbackDay);
  }

  return days.length === profile.trainingDays ? { ...plan, days } : fallback;
}

export function deterministicPlan(profile: Profile, available: ExerciseRecord[]): Plan {
  const allowed = available.filter((exercise) => {
    if (profile.equipment === "full_gym") return true;
    if (profile.equipment === "dumbbells") return ["dumbbell", "bodyweight"].includes(exercise.category);
    if (profile.equipment === "home_gym") return ["dumbbell", "bodyweight", "cable", "machine"].includes(exercise.category);
    return exercise.category === "bodyweight";
  });
  const preferred = ["Barbell Bench Press", "Barbell Row", "Barbell Squat", "Romanian Deadlift", "Overhead Press", "Lat Pulldown", "Leg Press", "Dumbbell Bench Press", "Dumbbell Row", "Goblet Squat", "Push-Up", "Pull-Up", "Plank"];
  const selected = preferred.map((name) => allowed.find((exercise) => exercise.name === name)).filter(Boolean) as ExerciseRecord[];
  const pool = [...selected, ...allowed.filter((exercise) => !selected.some((item) => item.id === exercise.id))];
  const split = profile.trainingDays <= 3 ? Array.from({ length: profile.trainingDays }, (_, index) => `Full Body ${String.fromCharCode(65 + index)}`) : profile.trainingDays === 4 ? ["Upper A", "Lower A", "Upper B", "Lower B"] : ["Push", "Pull", "Legs", "Upper", "Lower", "Full Body"].slice(0, profile.trainingDays);
  const byMuscle = (muscles: string[]) => pool.filter((exercise) => muscles.includes(exercise.primaryMuscleGroup)).slice(0, 5);
  const groups = ["chest", "back", "quads", "shoulders", "hamstrings", "glutes"];
  return { name: `${goalLabels[profile.goal]} starter plan`, days: split.map((name, index) => ({ name, exercises: byMuscle([groups[index % groups.length], groups[(index + 1) % groups.length], groups[(index + 2) % groups.length]]).slice(0, profile.sessionDuration <= 30 ? 3 : profile.sessionDuration <= 45 ? 4 : 5).map((exercise) => ({ exercise: exercise.name, sets: profile.experience === "beginner" ? 2 : 3, reps: profile.goal === "build_muscle" ? "8-12" : "8-15", rir: 2 })) })) };
}

