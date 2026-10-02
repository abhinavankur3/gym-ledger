import { describe, expect, it } from "vitest";
import { needsInput, parseRepRange, suggestSet, weightIncrement } from "./set-suggestions";

const S = (setNumber: number, weight: number | null, reps: number | null) => ({ setNumber, setType: "working", weight, reps, durationSeconds: null });
const base = { kind: "weighted" as const, category: "barbell", targetReps: "8-12", targetWeight: null, doneThisWorkout: [], lastSession: [] };

describe("parseRepRange", () => {
  it("parses ranges, single numbers and rejects text", () => {
    expect(parseRepRange("8-12")).toEqual({ min: 8, max: 12 });
    expect(parseRepRange("12–8")).toEqual({ min: 8, max: 12 });
    expect(parseRepRange("10")).toEqual({ min: 10, max: 10 });
    expect(parseRepRange("AMRAP")).toBeNull();
    expect(parseRepRange(null)).toBeNull();
  });
});

describe("suggestSet", () => {
  it("asks for a weight the first time a weighted exercise is done", () => {
    const s = suggestSet({ ...base, setIndex: 0 });
    expect([s.weight, s.reps]).toEqual([null, 8]);
    expect(needsInput("weighted", s)).toBe(true);
  });

  it("uses the plan's target weight when there is one", () => {
    const s = suggestSet({ ...base, targetWeight: 40, setIndex: 0 });
    expect([s.weight, s.reps]).toEqual([40, 8]);
    expect(needsInput("weighted", s)).toBe(false);
  });

  it("repeats last session when the top of the range wasn't reached", () => {
    const s = suggestSet({ ...base, setIndex: 1, lastSession: [S(1, 70, 8), S(2, 70, 8), S(3, 70, 7)] });
    expect([s.weight, s.reps, s.hint]).toEqual([70, 8, undefined]);
  });

  it("matches the set number, falling back to the last set", () => {
    const s = suggestSet({ ...base, setIndex: 4, lastSession: [S(1, 70, 10), S(2, 65, 9)] });
    expect([s.weight, s.reps]).toEqual([65, 9]);
  });

  it("adds weight and resets reps once every set hit the top of the range", () => {
    const s = suggestSet({ ...base, setIndex: 0, lastSession: [S(1, 70, 12), S(2, 70, 12), S(3, 70, 12)] });
    expect([s.weight, s.reps]).toEqual([72.5, 8]);
    expect(s.hint).toMatch(/\+2.5 kg/);
  });

  it("steps dumbbells by 2 kg", () => {
    expect(weightIncrement("dumbbell")).toBe(2);
    expect(suggestSet({ ...base, category: "dumbbell", setIndex: 0, lastSession: [S(1, 20, 12)] }).weight).toBe(22);
  });

  it("carries forward this workout's last set over history", () => {
    const s = suggestSet({ ...base, setIndex: 1, doneThisWorkout: [S(1, 75, 9)], lastSession: [S(1, 70, 12)] });
    expect([s.weight, s.reps]).toEqual([75, 9]);
  });

  it("adds a rep for bodyweight exercises instead of weight", () => {
    const s = suggestSet({ ...base, kind: "bodyweight", category: "bodyweight", setIndex: 0, lastSession: [S(1, null, 12)] });
    expect([s.weight, s.reps]).toEqual([null, 13]);
    expect(needsInput("bodyweight", s)).toBe(false);
  });

  it("uses seconds for timed exercises: plan number, else 60", () => {
    expect(suggestSet({ ...base, kind: "duration", category: "bodyweight", targetReps: "45", setIndex: 0 }).durationSeconds).toBe(45);
    expect(suggestSet({ ...base, kind: "duration", category: "cardio", targetReps: null, setIndex: 0 }).durationSeconds).toBe(60);
  });
});
