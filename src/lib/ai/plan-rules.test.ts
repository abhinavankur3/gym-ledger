import { describe, expect, it } from "vitest";
import { deterministicPlan, resolvePlan, type Profile } from "./plan-rules";
import { CATALOG } from "@/test/exercise-catalog";
import type { Plan } from "./plan-types";

const profile: Profile = {
  goal: "build_muscle",
  experience: "intermediate",
  age: 30,
  sex: "male",
  height: 178,
  weight: 78,
  activityLevel: "moderate",
  trainingDays: 4,
  sessionDuration: 60,
  equipment: "full_gym",
  dietaryPreferences: "none",
};

const day = (name: string, exercises: string[]) => ({
  name,
  exercises: exercises.map((exercise) => ({ exercise, sets: 3, reps: "8-12", rir: 2 })),
});

describe("deterministicPlan", () => {
  it("produces exactly the requested number of days", () => {
    for (const trainingDays of [2, 3, 4, 5, 6]) {
      expect(deterministicPlan({ ...profile, trainingDays }, CATALOG).days).toHaveLength(trainingDays);
    }
  });

  it("only uses equipment the user has", () => {
    const plan = deterministicPlan({ ...profile, equipment: "dumbbells" }, CATALOG);
    const categories = new Set(plan.days.flatMap((d) => d.exercises.map((e) => CATALOG.find((c) => c.name === e.exercise)!.category)));
    expect([...categories].every((c) => c === "dumbbell" || c === "bodyweight")).toBe(true);
  });

  it("scales exercises per day with session length", () => {
    const short = deterministicPlan({ ...profile, sessionDuration: 30 }, CATALOG);
    expect(short.days.every((d) => d.exercises.length <= 3)).toBe(true);
  });

  it("never includes exercises missing from the allowed catalog", () => {
    const allowed = CATALOG.filter((e) => !e.name.includes("Squat"));
    const plan = deterministicPlan(profile, allowed);
    expect(plan.days.flatMap((d) => d.exercises.map((e) => e.exercise)).some((n) => n.includes("Squat"))).toBe(false);
  });
});

describe("resolvePlan", () => {
  it("keeps a valid plan and normalises exercise name casing", () => {
    const plan: Plan = {
      name: "Upper/Lower",
      days: [
        day("Upper A", ["barbell bench press", "Barbell Row"]),
        day("Lower A", ["Barbell Squat", "Romanian Deadlift"]),
        day("Upper B", ["Overhead Press", "Lat Pulldown"]),
        day("Lower B", ["Leg Press", "Leg Curl"]),
      ],
    };
    const resolved = resolvePlan(plan, CATALOG, profile);
    expect(resolved.name).toBe("Upper/Lower");
    expect(resolved.days[0].exercises[0].exercise).toBe("Barbell Bench Press");
  });

  it("drops exercises that aren't in the catalog", () => {
    const plan: Plan = {
      name: "Plan",
      days: [
        day("A", ["Barbell Bench Press", "Barbell Row", "Imaginary Press"]),
        day("B", ["Barbell Squat", "Leg Curl"]),
        day("C", ["Overhead Press", "Lat Pulldown"]),
        day("D", ["Leg Press", "Hip Thrust"]),
      ],
    };
    const names = resolvePlan(plan, CATALOG, profile).days.flatMap((d) => d.exercises.map((e) => e.exercise));
    expect(names).not.toContain("Imaginary Press");
  });

  it("fills missing days from the fallback to match the schedule", () => {
    const plan: Plan = { name: "Short", days: [day("A", ["Barbell Bench Press", "Barbell Row"]), day("B", ["Barbell Squat", "Leg Curl"])] };
    expect(resolvePlan(plan, CATALOG, profile).days).toHaveLength(4);
  });

  it("trims extra days to match the schedule", () => {
    const plan: Plan = {
      name: "Long",
      days: Array.from({ length: 6 }, (_, i) => day(`D${i}`, ["Barbell Bench Press", "Barbell Row"])),
    };
    expect(resolvePlan(plan, CATALOG, profile).days).toHaveLength(4);
  });

  it("falls back entirely when the model's plan is mostly unusable", () => {
    const plan: Plan = { name: "Bad", days: [day("A", ["Nope", "Nada"]), day("B", ["Fake Lift", "Barbell Row"])] };
    const resolved = resolvePlan(plan, CATALOG, profile);
    expect(resolved).toEqual(deterministicPlan(profile, CATALOG));
  });
});
