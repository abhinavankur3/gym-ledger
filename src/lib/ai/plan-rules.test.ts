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

  it("keeps exercises outside the library with the muscle and category the model gave", () => {
    const plan: Plan = {
      name: "Plan",
      days: [
        { name: "A", exercises: [{ exercise: "Landmine Press", muscle: "shoulders", category: "barbell", sets: 3, reps: "8-10", rir: 2 }, ...day("A", ["Barbell Row"]).exercises] },
        day("B", ["Barbell Squat", "Leg Curl"]),
        day("C", ["Overhead Press", "Lat Pulldown"]),
        day("D", ["Leg Press", "Hip Thrust"]),
      ],
    };
    const first = resolvePlan(plan, CATALOG, profile).days[0].exercises[0];
    expect(first).toMatchObject({ exercise: "Landmine Press", muscle: "shoulders", category: "barbell" });
  });

  it("matches library names loosely and takes the library's muscle and category", () => {
    const plan: Plan = {
      name: "Plan",
      days: [day("A", ["barbell bench-press", "Push Ups"]), day("B", ["Barbell Squat", "Leg Curl"]), day("C", ["Overhead Press", "Lat Pulldown"]), day("D", ["Leg Press", "Hip Thrust"])],
    };
    const [bench, push] = resolvePlan(plan, CATALOG, profile).days[0].exercises;
    expect(bench).toMatchObject({ exercise: "Barbell Bench Press", muscle: "chest", category: "barbell" });
    expect(push.exercise).toBe("Push-Up");
  });

  it("defaults unknown muscle/category and cleans names", () => {
    const plan: Plan = {
      name: "Plan",
      days: [
        { name: "A", exercises: [{ exercise: "Sled <b>Push</b>!!", muscle: "nope" as never, category: "?" as never, sets: 3, reps: "20m", rir: 2 }, ...day("A", ["Barbell Row"]).exercises] },
        day("B", ["Barbell Squat", "Leg Curl"]), day("C", ["Overhead Press", "Lat Pulldown"]), day("D", ["Leg Press", "Hip Thrust"]),
      ],
    };
    expect(resolvePlan(plan, CATALOG, profile).days[0].exercises[0]).toMatchObject({ exercise: "Sled Push", muscle: "full_body", category: "other" });
  });

  it("removes anything on the avoid list, including new exercises the model invents", () => {
    const plan: Plan = {
      name: "Plan",
      days: [
        day("A", ["Barbell Bench Press", "Barbell Row", "Zercher Squat"]),
        day("B", ["Barbell Squat", "Leg Curl", "Hip Thrust"]),
        day("C", ["Overhead Press", "Lat Pulldown"]),
        day("D", ["Romanian Deadlift", "Hip Thrust", "Leg Curl"]),
      ],
    };
    const names = resolvePlan(plan, CATALOG, { ...profile, avoidMovements: "no squats" }).days.flatMap((d) => d.exercises.map((e) => e.exercise));
    expect(names.some((n) => /squat/i.test(n))).toBe(false);
    expect(names).toContain("Leg Curl");
  });

  it("drops duplicate exercises within a day", () => {
    const plan: Plan = { name: "Plan", days: [day("A", ["Barbell Row", "barbell row", "Lat Pulldown"]), day("B", ["Barbell Squat", "Leg Curl"]), day("C", ["Overhead Press", "Lat Pulldown"]), day("D", ["Leg Press", "Hip Thrust"])] };
    expect(resolvePlan(plan, CATALOG, profile).days[0].exercises.map((e) => e.exercise)).toEqual(["Barbell Row", "Lat Pulldown"]);
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

  it("falls back entirely when the model's plan is unusable", () => {
    const plan: Plan = { name: "Bad", days: [day("A", ["!!", "x"]), day("B", ["", "Barbell Row"])] };
    const resolved = resolvePlan(plan, CATALOG, profile);
    expect(resolved).toEqual(deterministicPlan(profile, CATALOG));
  });
});
