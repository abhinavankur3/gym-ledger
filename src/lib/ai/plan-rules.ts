/**
 * Pure plan rules: validating a model's plan against the schedule and avoid-list,
 * and the deterministic fallback plan. No database or network access, so it's
 * unit-tested directly.
 */
import { EXERCISE_CATEGORIES, MUSCLE_GROUPS, type ExerciseCategory, type MuscleGroup, type Plan, type PlanExercise } from "@/lib/ai/plan-types";
import { avoidedExercises } from "@/lib/ai/user-text";

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

/** Case, spacing and punctuation-insensitive key for matching exercise names. */
export function exerciseKey(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/s\b/g, "");
}

/** Keeps model-written names to plain, display-safe text. */
export function cleanExerciseName(name: string) {
  return name.replace(/<[^>]*>/g, " ").replace(/[^\p{L}\p{N} ()&'/+-]/gu, "").replace(/\s+/g, " ").trim().slice(0, 40);
}

/** Plan and day names written by the model: same charset rules, short. */
export function cleanPlanLabel(name: string) {
  return cleanExerciseName(name);
}

/** Exercises per day by session length, mirroring the fallback plan's pacing. */
export function maxExercisesFor(sessionMinutes: number) {
  if (sessionMinutes <= 30) return 4;
  if (sessionMinutes <= 45) return 5;
  if (sessionMinutes <= 60) return 6;
  return 8;
}

export const MAX_SETS_PER_DAY = 25;
const DEFAULT_REPS = "8-12";

/** Movements Kochi never programs, whatever the model suggests. */
const HIGH_RISK = ["behind the neck", "behind-the-neck", "kipping", "jefferson curl", "upright row to chin"];

export function isHighRisk(name: string) {
  const n = name.toLowerCase();
  return HIGH_RISK.some((m) => n.includes(m));
}

/**
 * "8-12", "10", "45s" (timed holds). Wordy model output keeps its leading range
 * ("8-10 per side" → "8-10", "30-45 seconds" → "30-45s"); anything else, or numbers
 * over 100, becomes "8-12".
 */
export function sanitizeReps(reps: string) {
  const value = String(reps ?? "").trim().toLowerCase().replace(/[–—]|\bto\b/g, "-").replace(/\s*-\s*/g, "-");
  const match = value.match(/^(\d{1,3})(?:-(\d{1,3}))?\s*(s\b|secs?\b|seconds?\b)?/);
  if (!match) return DEFAULT_REPS;
  const nums = [match[1], match[2]].filter(Boolean).map(Number);
  if (nums.some((n) => n < 1 || n > 100)) return DEFAULT_REPS;
  return `${nums.join("-")}${match[3] ? "s" : ""}`;
}

/**
 * Validates a model plan. Exercises aren't limited to the library: known names are
 * normalised to the library entry (so history and PRs carry over), new ones are kept
 * with the muscle and category the model gave. Anything the user asked to avoid is
 * removed, days are deduplicated, and the day count is forced to the user's schedule.
 */
export function resolvePlan(plan: Plan, library: ExerciseRecord[], profile: Profile): Plan {
  const known = new Map(library.map((exercise) => [exerciseKey(exercise.name), exercise]));
  const avoidNote = profile.avoidMovements;
  const fallback = deterministicPlan(profile, library);

  const maxExercises = maxExercisesFor(profile.sessionDuration);

  const validDays = plan.days.map((day, dayIndex) => {
    const seen = new Set<string>();
    const exercises: PlanExercise[] = [];
    let setsLeft = MAX_SETS_PER_DAY;
    for (const item of day.exercises) {
      if (exercises.length >= maxExercises || setsLeft < 1) break;
      const name = cleanExerciseName(item.exercise);
      if (name.length < 3 || isHighRisk(name)) continue;
      const match = known.get(exerciseKey(name));
      const resolved: PlanExercise = match
        ? { ...item, exercise: match.name, muscle: match.primaryMuscleGroup as MuscleGroup, category: match.category as ExerciseCategory }
        : { ...item, exercise: name, muscle: MUSCLE_GROUPS.includes(item.muscle!) ? item.muscle : "full_body", category: EXERCISE_CATEGORIES.includes(item.category!) ? item.category : "other" };
      const key = exerciseKey(resolved.exercise);
      if (seen.has(key) || avoidedExercises(avoidNote, [resolved.exercise]).size > 0) continue;
      seen.add(key);
      const sets = Math.min(Math.max(1, Math.round(Number(item.sets) || 3)), 6, setsLeft);
      setsLeft -= sets;
      exercises.push({ ...resolved, sets, reps: sanitizeReps(item.reps) });
    }
    return { name: cleanPlanLabel(day.name) || `Day ${dayIndex + 1}`, exercises };
  }).filter((day) => day.exercises.length >= 2);
  if (validDays.length < 2) return fallback;

  // Models can return a plausible split with the wrong number of days. Keep
  // the useful generated days, then fill or trim against the onboarding
  // contract so the persisted routine always matches the user's schedule.
  const days = validDays.slice(0, profile.trainingDays);
  for (const fallbackDay of fallback.days) {
    if (days.length >= profile.trainingDays) break;
    days.push(fallbackDay);
  }

  return days.length === profile.trainingDays ? { name: cleanPlanLabel(plan.name) || fallback.name, days } : fallback;
}

export function deterministicPlan(profile: Profile, library: ExerciseRecord[]): Plan {
  const avoided = avoidedExercises(profile.avoidMovements, library.map((e) => e.name));
  const allowed = library.filter((exercise) => !avoided.has(exercise.name)).filter((exercise) => {
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
  return { name: `${goalLabels[profile.goal]} starter plan`, days: split.map((name, index) => ({ name, exercises: byMuscle([groups[index % groups.length], groups[(index + 1) % groups.length], groups[(index + 2) % groups.length]]).slice(0, profile.sessionDuration <= 30 ? 3 : profile.sessionDuration <= 45 ? 4 : 5).map((exercise) => ({ exercise: exercise.name, muscle: exercise.primaryMuscleGroup as MuscleGroup, category: exercise.category as ExerciseCategory, sets: profile.experience === "beginner" ? 2 : 3, reps: profile.goal === "build_muscle" ? "8-12" : "8-15", rir: 2 })) })) };
}

