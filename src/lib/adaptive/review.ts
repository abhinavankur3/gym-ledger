/**
 * The adaptive engine's weekly review. Pure rules — no AI, no database — so
 * every proposal is explainable and unit-tested. The AI never decides changes;
 * it may later explain them (Kochi chat).
 */

export type Goal = "lose_fat" | "build_muscle" | "recomposition" | "general_fitness";

export type WeekStats = {
  /** Sessions the active plan scheduled */
  planned: number;
  /** Finished workouts */
  completed: number;
  /** Average share of planned sets actually logged across finished sessions (0–1), null when unknown */
  avgCompletion: number | null;
};

export type ReviewInput = {
  goal: Goal;
  trainingDays: number;
  sessionDuration: number;
  lastWeek: WeekStats;
  weekBefore: WeekStats;
  /** Exercises whose best set hasn't improved across their last three sessions */
  stalledExercises: string[];
  /** Whole weeks since the active plan was confirmed */
  weeksOnPlan: number;
  /** Whole weeks since the last accepted deload, null if never */
  weeksSinceDeload: number | null;
  /** Weigh-ins from roughly the last three weeks, in kg */
  weights: Array<{ date: string; kg: number }>;
  /** Days with any meal logged, and the average logged kcal on those days (missed logs count as not eaten) */
  intake: { daysLogged: number; avgKcal: number | null };
  hasMealPlan: boolean;
  kcalTarget: number;
  kcalAdjustment: number;
  prs: number;
};

export type ProposalType = "training_days" | "session_length" | "deload" | "calories";

export type Proposal = {
  id: string;
  type: ProposalType;
  title: string;
  reason: string;
  /** What accepting does, in the fields it touches */
  change: { trainingDays?: number; sessionDuration?: number; kcalDelta?: number; deload?: true };
  status: "pending" | "accepted" | "declined";
  decidedAt?: string;
};

export type ReviewSummary = {
  planned: number;
  completed: number;
  completionPct: number | null;
  prs: number;
  weeklyChangeKg: number | null;
  weeklyChangePct: number | null;
  intakeDays: number;
  avgKcal: number | null;
  kcalTarget: number;
  notes: string[];
};

/** Healthy weekly body-weight change for each goal, as % of body weight, and the midpoint we steer to. */
export const GOAL_RATE: Record<Goal, { min: number; max: number; aim: number; label: string }> = {
  lose_fat: { min: -1.0, max: -0.5, aim: -0.75, label: "lose 0.5–1% of body weight a week" },
  build_muscle: { min: 0.1, max: 0.5, aim: 0.3, label: "gain 0.1–0.5% a week" },
  recomposition: { min: -0.35, max: 0.15, aim: -0.1, label: "stay roughly level (−0.35% to +0.15% a week)" },
  general_fitness: { min: -0.25, max: 0.25, aim: 0, label: "stay roughly level (±0.25% a week)" },
};

/** Energy in a kilogram of body-weight change (rule-of-thumb mixed tissue). */
export const KCAL_PER_KG = 7700;
export const MAX_KCAL_STEP = 250;
export const MIN_KCAL_STEP = 100;
export const MAX_KCAL_ADJUSTMENT = 600;

const DAY_MS = 24 * 60 * 60 * 1000;
const round10 = (n: number) => Math.round(n / 10) * 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Weekly weight change from a least-squares line through the weigh-ins.
 * Needs at least 4 weigh-ins spanning 7+ days, otherwise null (not enough to act on).
 */
export function weightTrend(weights: ReviewInput["weights"]) {
  const points = weights
    .map((w) => ({ t: Date.parse(`${w.date}T12:00:00Z`) / DAY_MS, kg: w.kg }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.kg) && p.kg > 0)
    .sort((a, b) => a.t - b.t);
  if (points.length < 4 || points.at(-1)!.t - points[0].t < 7) return null;

  const n = points.length;
  const meanT = points.reduce((a, p) => a + p.t, 0) / n;
  const meanKg = points.reduce((a, p) => a + p.kg, 0) / n;
  const num = points.reduce((a, p) => a + (p.t - meanT) * (p.kg - meanKg), 0);
  const den = points.reduce((a, p) => a + (p.t - meanT) ** 2, 0);
  const kgPerWeek = (num / den) * 7;
  return { kgPerWeek: round2(kgPerWeek), pctPerWeek: round2((kgPerWeek / meanKg) * 100), avgKg: meanKg };
}

const missed = (w: WeekStats) => Math.max(0, w.planned - w.completed);

export function buildReview(input: ReviewInput): { summary: ReviewSummary; proposals: Proposal[] } {
  const proposals: Proposal[] = [];
  const notes: string[] = [];
  const { lastWeek, weekBefore } = input;
  const trend = weightTrend(input.weights);

  // 1. Repeatedly missing sessions → fewer training days (one structural change at a time)
  if (input.trainingDays > 2 && lastWeek.planned >= 2 && missed(lastWeek) >= 2 && missed(weekBefore) >= 2) {
    proposals.push({
      id: "training_days",
      type: "training_days",
      title: `Train ${input.trainingDays - 1} days a week instead of ${input.trainingDays}`,
      reason: `You finished ${lastWeek.completed} of ${lastWeek.planned} planned sessions last week and ${weekBefore.completed} of ${weekBefore.planned} the week before. A plan you can keep beats a bigger one you skip.`,
      change: { trainingDays: input.trainingDays - 1 },
      status: "pending",
    });
  } else if (input.sessionDuration > 30 && lastWeek.completed >= 2 && lastWeek.avgCompletion !== null && lastWeek.avgCompletion < 0.7) {
    // 2. Sessions keep ending early → shorter sessions
    proposals.push({
      id: "session_length",
      type: "session_length",
      title: `Shorter sessions: ${input.sessionDuration - 15} minutes`,
      reason: `On average you logged ${Math.round(lastWeek.avgCompletion * 100)}% of the planned sets last week. Shorter sessions you can finish will move you forward faster.`,
      change: { sessionDuration: input.sessionDuration - 15 },
      status: "pending",
    });
  }

  // 3. Several lifts stalled → a lighter week to recover and then push on
  if (input.stalledExercises.length >= 3 && input.weeksOnPlan >= 3 && (input.weeksSinceDeload === null || input.weeksSinceDeload >= 5)) {
    const names = input.stalledExercises.slice(0, 3).join(", ");
    proposals.push({
      id: "deload",
      type: "deload",
      title: "Take a lighter week",
      reason: `${names}${input.stalledExercises.length > 3 ? ` and ${input.stalledExercises.length - 3} more` : ""} haven't improved in three sessions. This week Kochi suggests 10% lighter weights and one fewer set per exercise, then you build back up.`,
      change: { deload: true },
      status: "pending",
    });
  }

  // 4. Weight trend outside the healthy band for the goal → nudge calories
  const band = GOAL_RATE[input.goal];
  if (trend && (trend.pctPerWeek < band.min || trend.pctPerWeek > band.max)) {
    const eatingOffTarget =
      input.intake.daysLogged >= 4 && input.intake.avgKcal !== null && Math.abs(input.intake.avgKcal - input.kcalTarget) / input.kcalTarget > 0.15;
    if (eatingOffTarget) {
      notes.push(
        `Your weight is ${trend.kgPerWeek > 0 ? "rising" : "falling"} faster than your goal, but you logged about ${Math.round(input.intake.avgKcal!)} kcal a day against a ${input.kcalTarget} target. Log every meal and get closer to the target before Kochi changes it.`
      );
    } else {
      const kgShiftPerWeek = ((band.aim - trend.pctPerWeek) / 100) * trend.avgKg;
      const raw = round10((kgShiftPerWeek * KCAL_PER_KG) / 7);
      const room = MAX_KCAL_ADJUSTMENT - Math.sign(raw) * input.kcalAdjustment;
      const delta = Math.sign(raw) * Math.min(Math.abs(raw), MAX_KCAL_STEP, Math.max(0, room));
      if (Math.abs(delta) >= MIN_KCAL_STEP) {
        const direction = delta > 0 ? "up" : "down";
        proposals.push({
          id: "calories",
          type: "calories",
          title: `${delta > 0 ? "Eat" : "Trim"} ${Math.abs(delta)} kcal a day ${delta > 0 ? "more" : "less"}`,
          reason: `Your weight changed ${trend.kgPerWeek > 0 ? "+" : ""}${trend.kgPerWeek} kg a week (${trend.pctPerWeek > 0 ? "+" : ""}${trend.pctPerWeek}%). For your goal the aim is to ${band.label}, so Kochi suggests moving your target ${direction} from ${input.kcalTarget} to ${input.kcalTarget + delta} kcal.`,
          change: { kcalDelta: delta },
          status: "pending",
        });
      } else if (room <= 0) {
        notes.push("Your calorie target has already been adjusted as far as Kochi will go automatically. If the trend continues, update your answers or talk to a professional.");
      }
    }
  } else if (!trend && input.hasMealPlan) {
    notes.push("Log your weight a few times a week so Kochi can check your calories are working.");
  }

  if (input.hasMealPlan && input.intake.daysLogged < 3) {
    notes.push(`Meals were logged on ${input.intake.daysLogged} day${input.intake.daysLogged === 1 ? "" : "s"} last week. A tap per meal is enough for Kochi to tune your plan.`);
  }
  if (lastWeek.planned > 0 && lastWeek.completed >= lastWeek.planned) notes.unshift("Every planned session done last week.");
  if (input.prs > 0) notes.unshift(`${input.prs} new personal record${input.prs === 1 ? "" : "s"} last week.`);

  return {
    summary: {
      planned: lastWeek.planned,
      completed: lastWeek.completed,
      completionPct: lastWeek.avgCompletion === null ? null : Math.round(lastWeek.avgCompletion * 100),
      prs: input.prs,
      weeklyChangeKg: trend?.kgPerWeek ?? null,
      weeklyChangePct: trend?.pctPerWeek ?? null,
      intakeDays: input.intake.daysLogged,
      avgKcal: input.intake.avgKcal === null ? null : Math.round(input.intake.avgKcal),
      kcalTarget: input.kcalTarget,
      notes,
    },
    proposals,
  };
}

/** Whether the best set of a sequence of sessions (oldest first) shows no improvement in weight or reps. */
export function isStalled(sessions: Array<{ weight: number | null; reps: number | null }>) {
  if (sessions.length < 3) return false;
  const last3 = sessions.slice(-3);
  const score = (s: { weight: number | null; reps: number | null }) => [s.weight ?? 0, s.reps ?? 0] as const;
  const [w0, r0] = score(last3[0]);
  return last3.slice(1).every((s) => {
    const [w, r] = score(s);
    return w < w0 || (w === w0 && r <= r0);
  });
}
