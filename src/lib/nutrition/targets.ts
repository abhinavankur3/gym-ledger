/**
 * Daily energy and macro targets, computed in code (never by the model).
 *
 * Resting energy:
 * - Mifflin-St Jeor for the general population (Frankenfield 2005; Academy of
 *   Nutrition and Dietetics recommendation).
 * - ten Haaf & Weijs 2014 for trained people (intermediate/advanced): Mifflin
 *   underestimates athletes (Sports Med 2023 meta-analysis).
 * - Cunningham 1980 when a recent body-fat reading gives lean mass.
 * Every result is a starting estimate; the adaptive engine refines it from the
 * real weight trend later.
 */

export type Sex = "male" | "female" | "prefer_not_to_say";
export type Goal = "lose_fat" | "build_muscle" | "recomposition" | "general_fitness";
export type Experience = "beginner" | "intermediate" | "advanced";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "very_active";

export type TargetInput = {
  sex: string;
  age: number;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  experience: Experience;
  activityLevel: ActivityLevel;
  trainingDays: number;
  sessionMinutes: number;
  /** Latest body-fat %, if the user logged one */
  bodyFatPercent?: number | null;
  /** Correction learned by the weekly review from the real weight trend (kcal) */
  kcalAdjustment?: number;
};

export type RmrMethod = "mifflin" | "ten-haaf" | "cunningham";

export type NutritionTargets = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Working shown on the targets card */
  breakdown: {
    method: RmrMethod;
    rmr: number;
    dailyLife: number;
    training: number;
    maintenance: number;
    goalAdjustment: number;
    adaptiveAdjustment: number;
    proteinPerKg: number;
  };
};

/** Multiplier on resting energy for daily life *outside* training. */
const NEAT_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.3,
  moderate: 1.4,
  very_active: 1.55,
};

/** Net MET above rest for a typical resistance session (Compendium: 3.5 moderate – 6 vigorous, minus 1 for rest). */
const TRAINING_NET_MET = 4;

const GOAL_ADJUSTMENT: Record<Goal, number> = {
  lose_fat: -0.2,
  build_muscle: 0.1,
  recomposition: 0,
  general_fitness: 0,
};

/** Upper part of the 1.6–2.2 g/kg evidence range when cutting or recomping, to protect lean mass. */
const PROTEIN_PER_KG: Record<Goal, number> = {
  lose_fat: 2.0,
  build_muscle: 1.8,
  recomposition: 2.0,
  general_fitness: 1.6,
};

const FAT_SHARE = 0.27;
const MIN_FAT_PER_KG = 0.6;

function sexTerm(sex: string, male: number, female: number) {
  if (sex === "male") return male;
  if (sex === "female") return female;
  return (male + female) / 2;
}

export function mifflinStJeor({ sex, age, heightCm, weightKg }: Pick<TargetInput, "sex" | "age" | "heightCm" | "weightKg">) {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + sexTerm(sex, 5, -161);
}

export function tenHaaf({ sex, age, heightCm, weightKg }: Pick<TargetInput, "sex" | "age" | "heightCm" | "weightKg">) {
  return 11.936 * weightKg + 587.728 * (heightCm / 100) - 8.129 * age + sexTerm(sex, 191.027, 0) + 29.279;
}

export function cunningham(leanMassKg: number) {
  return 500 + 22 * leanMassKg;
}

export function restingEnergy(input: TargetInput): { method: RmrMethod; rmr: number } {
  const bf = input.bodyFatPercent;
  if (bf != null && bf >= 3 && bf <= 60) {
    return { method: "cunningham", rmr: cunningham(input.weightKg * (1 - bf / 100)) };
  }
  if (input.experience !== "beginner") return { method: "ten-haaf", rmr: tenHaaf(input) };
  return { method: "mifflin", rmr: mifflinStJeor(input) };
}

const round = (n: number, step = 1) => Math.round(n / step) * step;

export function computeTargets(input: TargetInput): NutritionTargets {
  const { method, rmr } = restingEnergy(input);
  const dailyLife = rmr * NEAT_FACTOR[input.activityLevel];
  // Weekly training energy spread across the week
  const training = (TRAINING_NET_MET * input.weightKg * (input.trainingDays * input.sessionMinutes)) / 60 / 7;
  const maintenance = dailyLife + training;
  const goalAdjustment = maintenance * GOAL_ADJUSTMENT[input.goal];
  // Never plan below resting energy or a 1,200 kcal floor
  const adaptiveAdjustment = input.kcalAdjustment ?? 0;
  const kcal = round(Math.max(maintenance + goalAdjustment + adaptiveAdjustment, rmr, 1200), 10);

  // Protein on a reference weight for higher BMIs (weight at BMI 27), so targets stay realistic
  const heightM = input.heightCm / 100;
  const referenceWeight = Math.min(input.weightKg, 27 * heightM * heightM);
  const proteinPerKg = PROTEIN_PER_KG[input.goal];
  const protein = round(referenceWeight * proteinPerKg);
  const fat = round(Math.max((kcal * FAT_SHARE) / 9, MIN_FAT_PER_KG * input.weightKg));
  const carbs = Math.max(0, round((kcal - protein * 4 - fat * 9) / 4));

  return {
    kcal,
    protein,
    carbs,
    fat,
    breakdown: {
      method,
      rmr: round(rmr),
      dailyLife: round(dailyLife),
      training: round(training),
      maintenance: round(maintenance),
      goalAdjustment: round(goalAdjustment),
      adaptiveAdjustment,
      proteinPerKg,
    },
  };
}

export const METHOD_LABEL: Record<RmrMethod, string> = {
  mifflin: "Mifflin-St Jeor",
  "ten-haaf": "ten Haaf (trained adults)",
  cunningham: "Cunningham (from your body fat)",
};
