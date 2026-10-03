import { describe, expect, it } from "vitest";
import { buildReview, isStalled, weightTrend, type ReviewInput } from "./review";

const week = (planned: number, completed: number, avgCompletion: number | null = 1) => ({ planned, completed, avgCompletion });
const daysAgo = (n: number) => new Date(Date.UTC(2026, 9, 20) - n * 864e5).toISOString().slice(0, 10);
const weights = (start: number, perWeek: number, days = [0, 3, 6, 9, 12]) => days.map((d) => ({ date: daysAgo(14 - d), kg: start + (perWeek / 7) * d }));

const base: ReviewInput = {
  goal: "lose_fat",
  trainingDays: 4,
  sessionDuration: 60,
  lastWeek: week(4, 4),
  weekBefore: week(4, 4),
  stalledExercises: [],
  weeksOnPlan: 4,
  weeksSinceDeload: null,
  weights: weights(80, -0.6),
  intake: { daysLogged: 6, avgKcal: 2100 },
  hasMealPlan: true,
  kcalTarget: 2100,
  kcalAdjustment: 0,
  prs: 2,
};
const types = (input: ReviewInput) => buildReview(input).proposals.map((p) => p.type);

describe("weightTrend", () => {
  it("fits a weekly rate through the weigh-ins", () => {
    const t = weightTrend(weights(80, -0.7))!;
    expect(t.kgPerWeek).toBeCloseTo(-0.7, 1);
    expect(t.pctPerWeek).toBeCloseTo(-0.88, 1);
  });

  it("needs at least four weigh-ins spanning a week", () => {
    expect(weightTrend(weights(80, -1, [0, 2, 4]))).toBeNull();
    expect(weightTrend(weights(80, -1, [0, 1, 2, 3]))).toBeNull();
  });
});

describe("buildReview", () => {
  it("proposes nothing when things are on track, and notes the wins", () => {
    const { proposals, summary } = buildReview(base);
    expect(proposals).toEqual([]);
    expect(summary.notes[0]).toMatch(/2 new personal records/);
    expect(summary.notes).toContain("Every planned session done last week.");
  });

  it("suggests one fewer training day after two weeks of missed sessions", () => {
    const p = buildReview({ ...base, lastWeek: week(4, 2), weekBefore: week(4, 1) }).proposals[0];
    expect(p.type).toBe("training_days");
    expect(p.change.trainingDays).toBe(3);
    expect(p.reason).toMatch(/2 of 4/);
  });

  it("doesn't go below two training days or react to one bad week", () => {
    expect(types({ ...base, trainingDays: 2, lastWeek: week(2, 0), weekBefore: week(2, 0) })).not.toContain("training_days");
    expect(types({ ...base, lastWeek: week(4, 1), weekBefore: week(4, 4) })).not.toContain("training_days");
  });

  it("suggests shorter sessions when most sessions end early", () => {
    const p = buildReview({ ...base, lastWeek: week(4, 4, 0.55) }).proposals.find((x) => x.type === "session_length")!;
    expect(p.change.sessionDuration).toBe(45);
    expect(types({ ...base, sessionDuration: 30, lastWeek: week(4, 4, 0.55) })).not.toContain("session_length");
  });

  it("suggests a lighter week when several lifts stall, but not too often", () => {
    const stalled = ["Bench press", "Row", "Squat"];
    expect(types({ ...base, stalledExercises: stalled })).toContain("deload");
    expect(types({ ...base, stalledExercises: stalled, weeksSinceDeload: 2 })).not.toContain("deload");
    expect(types({ ...base, stalledExercises: stalled, weeksOnPlan: 2 })).not.toContain("deload");
  });

  it("trims calories when fat loss has stalled", () => {
    const p = buildReview({ ...base, weights: weights(80, 0) }).proposals.find((x) => x.type === "calories")!;
    // Aim −0.75%/wk of 80 kg = −0.6 kg/wk ≈ −660 kcal/day, capped at 250
    expect(p.change.kcalDelta).toBe(-250);
    expect(p.title).toBe("Trim 250 kcal a day less");
  });

  it("adds calories when muscle gain is too slow and steps by the real gap", () => {
    const p = buildReview({ ...base, goal: "build_muscle", weights: weights(70, 0.0) }).proposals.find((x) => x.type === "calories")!;
    expect(p.change.kcalDelta).toBeGreaterThan(0);
    expect(p.change.kcalDelta).toBeLessThanOrEqual(250);
  });

  it("doesn't change the target when you're eating far from it", () => {
    const r = buildReview({ ...base, weights: weights(80, 0), intake: { daysLogged: 6, avgKcal: 2700 } });
    expect(r.proposals.map((p) => p.type)).not.toContain("calories");
    expect(r.summary.notes.join(" ")).toMatch(/logged about 2700 kcal a day against a 2100 target/);
  });

  it("respects the overall adjustment cap", () => {
    expect(types({ ...base, weights: weights(80, 0), kcalAdjustment: -600 })).not.toContain("calories");
    const p = buildReview({ ...base, weights: weights(80, 0), kcalAdjustment: -450 }).proposals.find((x) => x.type === "calories")!;
    expect(p.change.kcalDelta).toBe(-150);
  });

  it("asks for weigh-ins and meal logs when data is thin", () => {
    const notes = buildReview({ ...base, weights: [], intake: { daysLogged: 1, avgKcal: 1800 } }).summary.notes.join(" ");
    expect(notes).toMatch(/Log your weight/);
    expect(notes).toMatch(/logged on 1 day/);
  });
});

describe("isStalled", () => {
  it("detects no improvement across the last three sessions", () => {
    expect(isStalled([{ weight: 60, reps: 8 }, { weight: 60, reps: 8 }, { weight: 60, reps: 7 }])).toBe(true);
    expect(isStalled([{ weight: 60, reps: 8 }, { weight: 60, reps: 9 }, { weight: 60, reps: 8 }])).toBe(false);
    expect(isStalled([{ weight: 60, reps: 8 }, { weight: 62.5, reps: 6 }, { weight: 60, reps: 8 }])).toBe(false);
    expect(isStalled([{ weight: 60, reps: 8 }, { weight: 60, reps: 8 }])).toBe(false);
  });
});
