import { describe, expect, it } from "vitest";
import { computeTargets, cunningham, mifflinStJeor, restingEnergy, tenHaaf, type TargetInput } from "./targets";

const base: TargetInput = {
  sex: "male",
  age: 30,
  heightCm: 178,
  weightKg: 78,
  goal: "general_fitness",
  experience: "beginner",
  activityLevel: "moderate",
  trainingDays: 4,
  sessionMinutes: 60,
};

describe("resting energy equations", () => {
  it("matches published Mifflin-St Jeor values", () => {
    // 10*78 + 6.25*178 - 5*30 + 5 = 1747.5
    expect(mifflinStJeor(base)).toBeCloseTo(1747.5, 1);
    expect(mifflinStJeor({ ...base, sex: "female" })).toBeCloseTo(1581.5, 1);
  });

  it("matches the ten Haaf weight-based equation", () => {
    // 11.936*78 + 587.728*1.78 - 8.129*30 + 191.027 + 29.279
    expect(tenHaaf(base)).toBeCloseTo(931.008 + 1046.156 - 243.87 + 191.027 + 29.279, 1);
  });

  it("matches Cunningham", () => {
    expect(cunningham(60)).toBe(1820);
  });

  it("picks the equation from experience and body fat", () => {
    expect(restingEnergy(base).method).toBe("mifflin");
    expect(restingEnergy({ ...base, experience: "advanced" }).method).toBe("ten-haaf");
    expect(restingEnergy({ ...base, bodyFatPercent: 18 }).method).toBe("cunningham");
    expect(restingEnergy({ ...base, bodyFatPercent: 90 }).method).toBe("mifflin");
  });

  it("averages the sex term when sex isn't given", () => {
    expect(mifflinStJeor({ ...base, sex: "prefer_not_to_say" })).toBeCloseTo((1747.5 + 1581.5) / 2, 1);
  });
});

describe("computeTargets", () => {
  it("adds training energy on top of daily life", () => {
    const t = computeTargets(base);
    // 4 net MET * 78 kg * 4 h / 7 days ≈ 178 kcal/day
    expect(t.breakdown.training).toBe(178);
    expect(t.breakdown.maintenance).toBe(Math.round(1747.5 * 1.4 + 4 * 78 * 4 / 7));
  });

  it("applies the goal adjustment", () => {
    const maintain = computeTargets(base).kcal;
    expect(computeTargets({ ...base, goal: "lose_fat" }).kcal).toBeLessThan(maintain * 0.85);
    expect(computeTargets({ ...base, goal: "build_muscle" }).kcal).toBeGreaterThan(maintain * 1.05);
  });

  it("never goes below resting energy or 1200 kcal", () => {
    const t = computeTargets({ ...base, sex: "female", weightKg: 45, heightCm: 150, age: 60, activityLevel: "sedentary", trainingDays: 0, goal: "lose_fat" });
    expect(t.kcal).toBeGreaterThanOrEqual(1200);
    expect(t.kcal).toBeGreaterThanOrEqual(t.breakdown.rmr);
  });

  it("sets protein per kg by goal, capped at a BMI-27 reference weight", () => {
    expect(computeTargets({ ...base, goal: "lose_fat" }).protein).toBe(156); // 78 * 2.0
    const heavy = computeTargets({ ...base, weightKg: 130 });
    expect(heavy.protein).toBe(Math.round(27 * 1.78 * 1.78 * 1.6));
  });

  it("applies the weekly review's adjustment but keeps the safety floor", () => {
    const plain = computeTargets(base).kcal;
    expect(computeTargets({ ...base, kcalAdjustment: -150 }).kcal).toBe(plain - 150);
    const floored = computeTargets({ ...base, sex: "female", weightKg: 48, heightCm: 152, age: 55, activityLevel: "sedentary", trainingDays: 0, goal: "lose_fat", kcalAdjustment: -600 });
    expect(floored.kcal).toBeGreaterThanOrEqual(1200);
    expect(floored.breakdown.adaptiveAdjustment).toBe(-600);
  });

  it("macros add back up to the calorie target", () => {
    for (const goal of ["lose_fat", "build_muscle", "recomposition", "general_fitness"] as const) {
      const t = computeTargets({ ...base, goal });
      expect(Math.abs(t.protein * 4 + t.carbs * 4 + t.fat * 9 - t.kcal)).toBeLessThan(15);
    }
  });
});
