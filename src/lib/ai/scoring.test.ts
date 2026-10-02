import { describe, expect, it } from "vitest";
import { pickBest } from "./scoring";

describe("pickBest", () => {
  it("picks the highest total across questions", () => {
    expect(pickBest([{ fit: 2.1, balance: 3 }, { fit: 3.4, balance: 2.9 }])).toBe(1);
  });

  it("keeps the first candidate on ties", () => {
    expect(pickBest([{ fit: 3 }, { fit: 3 }])).toBe(0);
  });

  it("ignores failed scores, and falls back to the first when all failed", () => {
    expect(pickBest([null, { fit: 1 }])).toBe(1);
    expect(pickBest([null, null])).toBe(0);
  });
});
