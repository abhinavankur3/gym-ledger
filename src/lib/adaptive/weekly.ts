import "server-only";

import { and, asc, desc, eq, gte, inArray, isNotNull, lt, ne } from "drizzle-orm";
import db from "@/lib/db";
import { bodyMetrics, mealLogs, routines, userProfiles, weeklyReviews, workoutSets, workouts, workoutTemplateExercises } from "@/lib/db/schema";
import { localDateKey, localDateKeyDaysAgo, startOfLocalWeekIso } from "@/lib/dates";
import { computeTargets } from "@/lib/nutrition/targets";
import { buildReview, isStalled, type Proposal, type ReviewInput, type ReviewSummary, type WeekStats } from "./review";

const DAY_MS = 24 * 60 * 60 * 1000;
const LB_TO_KG = 0.45359237;
/** A day counts as logged for intake when at least this many meals were logged */
const FULL_DAY_MEALS = 3;

/** Local Monday (YYYY-MM-DD) of the week containing `date`. */
export function weekKey(date: Date, timeZone: string) {
  return localDateKey(startOfLocalWeekIso(date, timeZone), timeZone);
}

function weekBoundaries(now: Date, timeZone: string) {
  const thisStart = startOfLocalWeekIso(now, timeZone);
  const lastStart = startOfLocalWeekIso(new Date(Date.parse(thisStart) - 3 * DAY_MS), timeZone);
  const beforeStart = startOfLocalWeekIso(new Date(Date.parse(lastStart) - 3 * DAY_MS), timeZone);
  return {
    thisStart,
    lastStart,
    beforeStart,
    thisKey: localDateKey(thisStart, timeZone),
    lastKey: localDateKey(lastStart, timeZone),
  };
}

export type StoredReview = { id: number; weekStart: string; summary: ReviewSummary; proposals: Proposal[]; createdAt: string };

function parseReview(row: typeof weeklyReviews.$inferSelect): StoredReview | null {
  try {
    return { id: row.id, weekStart: row.weekStart, summary: JSON.parse(row.summaryJson), proposals: JSON.parse(row.proposalsJson), createdAt: row.createdAt };
  } catch {
    return null;
  }
}

/** Finished workouts in [from, to) with the share of their planned sets that were logged. */
async function weekStats(userId: number, from: string, to: string, planned: number): Promise<WeekStats & { workoutIds: number[] }> {
  const done = await db.query.workouts.findMany({
    where: and(eq(workouts.userId, userId), gte(workouts.startedAt, from), lt(workouts.startedAt, to), isNotNull(workouts.completedAt)),
    columns: { id: true, templateId: true },
  });
  if (!done.length) return { planned, completed: 0, avgCompletion: null, workoutIds: [] };

  const ids = done.map((w) => w.id);
  const templateIds = [...new Set(done.map((w) => w.templateId).filter((t): t is number => t !== null))];
  const [sets, targets] = await Promise.all([
    db.select({ workoutId: workoutSets.workoutId }).from(workoutSets).where(and(inArray(workoutSets.workoutId, ids), ne(workoutSets.setType, "warmup"))),
    templateIds.length
      ? db.select({ templateId: workoutTemplateExercises.templateId, targetSets: workoutTemplateExercises.targetSets }).from(workoutTemplateExercises).where(inArray(workoutTemplateExercises.templateId, templateIds))
      : Promise.resolve([]),
  ]);

  const ratios = done.flatMap((w) => {
    if (w.templateId === null) return [];
    const plannedSets = targets.filter((t) => t.templateId === w.templateId).reduce((a, t) => a + (t.targetSets ?? 3), 0);
    if (!plannedSets) return [];
    const logged = sets.filter((s) => s.workoutId === w.id).length;
    return [Math.min(1, logged / plannedSets)];
  });
  return {
    planned,
    completed: done.length,
    avgCompletion: ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : null,
    workoutIds: ids,
  };
}

/** Exercises in the active plan whose best working set hasn't improved over their last three sessions. */
async function stalledExercises(userId: number, exerciseIds: number[], before: string) {
  if (!exerciseIds.length) return [];
  const rows = await db
    .select({ exerciseId: workoutSets.exerciseId, workoutId: workoutSets.workoutId, startedAt: workouts.startedAt, weight: workoutSets.weight, reps: workoutSets.reps })
    .from(workoutSets)
    .innerJoin(workouts, eq(workoutSets.workoutId, workouts.id))
    .where(and(eq(workouts.userId, userId), inArray(workoutSets.exerciseId, exerciseIds), lt(workouts.startedAt, before), isNotNull(workouts.completedAt), ne(workoutSets.setType, "warmup")))
    .orderBy(asc(workouts.startedAt));

  const names = await db.query.exercises.findMany({ where: (e, { inArray: inA }) => inA(e.id, exerciseIds), columns: { id: true, name: true } });
  const stalled: string[] = [];
  for (const id of exerciseIds) {
    // Best set per session, oldest first
    const bySession = new Map<number, { weight: number | null; reps: number | null }>();
    for (const r of rows.filter((x) => x.exerciseId === id)) {
      const best = bySession.get(r.workoutId);
      if (!best || (r.weight ?? 0) > (best.weight ?? 0) || ((r.weight ?? 0) === (best.weight ?? 0) && (r.reps ?? 0) > (best.reps ?? 0))) {
        bySession.set(r.workoutId, { weight: r.weight, reps: r.reps });
      }
    }
    if (isStalled([...bySession.values()])) stalled.push(names.find((n) => n.id === id)?.name ?? "An exercise");
  }
  return stalled;
}

/**
 * Builds last week's review the first time the user opens the app in a new week.
 * Returns the stored review for last week (new or existing), or null when there
 * isn't a full week of history or no active plan yet.
 */
export async function ensureWeeklyReview(userId: number, timeZone: string): Promise<StoredReview | null> {
  const now = new Date();
  const b = weekBoundaries(now, timeZone);

  const existing = await db.query.weeklyReviews.findFirst({ where: and(eq(weeklyReviews.userId, userId), eq(weeklyReviews.weekStart, b.lastKey)) });
  if (existing) return parseReview(existing);

  const [profile, routine] = await Promise.all([
    db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, userId) }),
    db.query.routines.findFirst({
      where: and(eq(routines.userId, userId), eq(routines.isActive, true)),
      with: { days: { with: { template: { with: { exercises: { columns: { exerciseId: true } } } } } } },
    }),
  ]);
  // Needs a profile, a plan, and a full week of history before reviewing anything
  if (!profile || !routine || Date.parse(`${routine.createdAt.replace(" ", "T")}Z`) > Date.parse(b.lastStart)) return null;

  const planned = routine.days.length;
  const routineExerciseIds = [...new Set(routine.days.flatMap((d) => d.template.exercises.map((e) => e.exerciseId)))];

  const [lastWeek, weekBefore, stalled, weightRows, logs, activeMealPlan] = await Promise.all([
    weekStats(userId, b.lastStart, b.thisStart, planned),
    weekStats(userId, b.beforeStart, b.lastStart, planned),
    stalledExercises(userId, routineExerciseIds, b.thisStart),
    db.query.bodyMetrics.findMany({
      where: and(eq(bodyMetrics.userId, userId), eq(bodyMetrics.metricType, "weight"), gte(bodyMetrics.date, localDateKeyDaysAgo(now, 21, timeZone))),
      orderBy: [asc(bodyMetrics.date)],
    }),
    db.query.mealLogs.findMany({ where: and(eq(mealLogs.userId, userId), gte(mealLogs.date, b.lastKey), lt(mealLogs.date, b.thisKey)), columns: { date: true, kcal: true } }),
    db.query.nutritionPlans.findFirst({ where: (n, { and: a, eq: e }) => a(e(n.userId, userId), e(n.status, "active")), columns: { id: true } }),
  ]);

  const prs = lastWeek.workoutIds.length
    ? (await db.select({ id: workoutSets.id }).from(workoutSets).where(and(inArray(workoutSets.workoutId, lastWeek.workoutIds), eq(workoutSets.isPr, true)))).length
    : 0;

  const byDay = new Map<string, { meals: number; kcal: number }>();
  for (const l of logs) {
    const d = byDay.get(l.date) ?? { meals: 0, kcal: 0 };
    byDay.set(l.date, { meals: d.meals + 1, kcal: d.kcal + l.kcal });
  }
  const fullDays = [...byDay.values()].filter((d) => d.meals >= FULL_DAY_MEALS);

  const weights = weightRows.map((w) => ({ date: w.date, kg: w.unit === "lbs" ? w.value * LB_TO_KG : w.value }));
  const latestKg = weights.at(-1)?.kg ?? profile.weight;
  const targets = computeTargets({
    sex: profile.sex,
    age: profile.age,
    heightCm: profile.height,
    weightKg: latestKg,
    goal: profile.goal,
    experience: profile.experience,
    activityLevel: profile.activityLevel,
    trainingDays: profile.trainingDays,
    sessionMinutes: profile.sessionDuration,
    kcalAdjustment: profile.kcalAdjustment,
  });

  const input: ReviewInput = {
    goal: profile.goal,
    trainingDays: profile.trainingDays,
    sessionDuration: profile.sessionDuration,
    lastWeek,
    weekBefore,
    stalledExercises: stalled,
    weeksOnPlan: Math.floor((Date.parse(b.thisStart) - Date.parse(`${routine.createdAt.replace(" ", "T")}Z`)) / (7 * DAY_MS)),
    weeksSinceDeload: profile.deloadWeek ? Math.floor((Date.parse(`${b.thisKey}T00:00:00Z`) - Date.parse(`${profile.deloadWeek}T00:00:00Z`)) / (7 * DAY_MS)) : null,
    weights,
    intake: { daysLogged: fullDays.length, avgKcal: fullDays.length ? fullDays.reduce((a, d) => a + d.kcal, 0) / fullDays.length : null },
    hasMealPlan: !!activeMealPlan,
    kcalTarget: targets.kcal,
    kcalAdjustment: profile.kcalAdjustment,
    prs,
  };

  const { summary, proposals } = buildReview(input);
  await db
    .insert(weeklyReviews)
    .values({ userId, weekStart: b.lastKey, summaryJson: JSON.stringify(summary), proposalsJson: JSON.stringify(proposals) })
    .onConflictDoNothing();
  const row = await db.query.weeklyReviews.findFirst({ where: and(eq(weeklyReviews.userId, userId), eq(weeklyReviews.weekStart, b.lastKey)) });
  return row ? parseReview(row) : null;
}

/** Past reviews, newest first: the log of every change Kochi proposed and what the user decided. */
export async function reviewHistory(userId: number, limit = 12) {
  const rows = await db.query.weeklyReviews.findMany({ where: eq(weeklyReviews.userId, userId), orderBy: [desc(weeklyReviews.weekStart)], limit });
  return rows.map(parseReview).filter((r): r is StoredReview => r !== null);
}
