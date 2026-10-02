import { describe, expect, it } from "vitest";
import { AVOID_MAX, FEEDBACK_MAX, avoidedExercises, sanitizeUserText } from "./user-text";
import { CATALOG } from "@/test/exercise-catalog";

const names = CATALOG.map((e) => e.name);
const avoided = (note: string) => [...avoidedExercises(note, names)].sort();

describe("sanitizeUserText", () => {
  it("strips control characters and collapses whitespace", () => {
    expect(sanitizeUserText("no\u0000 squats\u0007\n\n  please", FEEDBACK_MAX)).toBe("no squats please");
  });

  it("caps the length", () => {
    expect(sanitizeUserText("x".repeat(1000), FEEDBACK_MAX)).toHaveLength(600);
    expect(sanitizeUserText("x".repeat(1000), AVOID_MAX)).toHaveLength(300);
  });

  it("handles empty input", () => {
    expect(sanitizeUserText(null, 10)).toBe("");
    expect(sanitizeUserText(undefined, 10)).toBe("");
  });
});

describe("avoidedExercises", () => {
  it("returns nothing for an empty note", () => {
    expect(avoided("")).toEqual([]);
  });

  it("removes exercises named directly, including plurals", () => {
    const result = avoided("I dislike deadlifts");
    expect(result).toContain("Deadlift");
    expect(result).toContain("Romanian Deadlift");
    expect(result).toContain("Stiff-Leg Deadlift");
    expect(result).not.toContain("Barbell Row");
  });

  it("removes every squat variation for 'no squats'", () => {
    const result = avoided("no squats");
    expect(result).toEqual(expect.arrayContaining(["Barbell Squat", "Front Squat", "Goblet Squat", "Hack Squat", "Bulgarian Split Squat"]));
    expect(result).not.toContain("Leg Press");
  });

  it("maps a body area to the movements that load it", () => {
    const result = avoided("Replace barbell squats because my knee feels uncomfortable");
    expect(result).toEqual(expect.arrayContaining(["Barbell Squat", "Walking Lunge", "Leg Press", "Leg Extension"]));
    expect(result).not.toContain("Barbell Bench Press");
  });

  it("matches multi-word names without removing every press", () => {
    const result = avoided("skip overhead press");
    expect(result).toContain("Overhead Press");
    expect(result).not.toContain("Barbell Bench Press");
    expect(result).not.toContain("Leg Press");
  });

  it("keeps equipment words usable inside a phrase", () => {
    const result = avoided("no barbell rows");
    expect(result).toContain("Barbell Row");
    expect(result).not.toContain("Seated Cable Row");
    expect(result).not.toContain("Barbell Curl");
  });

  it("does not treat filler or generic words as exercises", () => {
    expect(avoided("please keep it light, nothing heavy")).toEqual([]);
    expect(avoided("press")).toEqual([]);
  });
});
