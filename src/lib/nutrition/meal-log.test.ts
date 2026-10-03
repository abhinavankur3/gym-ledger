import { describe, expect, it } from "vitest";
import { confirmEstimate, isGenericTitle, logFromPlan, resolveEstimate, slotForHour, sumIntake, titleFromItems } from "./meal-log";

const meal = {
  slot: "lunch" as const,
  title: "Rajma chawal",
  items: [
    { name: "Rajma", portion: "1 katori", servings: 1.5, kcal: 200, protein: 10, carbs: 25, fat: 6 },
    { name: "Rice", portion: "1 cup", servings: 1, kcal: 200, protein: 4, carbs: 44, fat: 0.5 },
  ],
};

describe("logFromPlan", () => {
  it("logs the planned meal as eaten", () => {
    const log = logFromPlan(meal, 1);
    expect(log.totals.kcal).toBe(500);
    expect(log.totals.protein).toBe(19);
    expect(log.items[0].servings).toBe(1.5);
  });

  it("scales everything for a partial portion", () => {
    const log = logFromPlan(meal, 0.5);
    expect(log.totals.kcal).toBe(250);
    expect(log.items[0].servings).toBe(0.75);
  });

  it("clamps silly portions", () => {
    expect(logFromPlan(meal, 0).items[1].servings).toBe(0.25);
    expect(logFromPlan(meal, 99).items[1].servings).toBe(3);
  });
});

describe("slotForHour", () => {
  it("maps the time of day to a meal", () => {
    expect([7, 12, 17, 21].map(slotForHour)).toEqual(["breakfast", "lunch", "snack", "dinner"]);
  });
});

describe("sumIntake", () => {
  it("adds up logs and counts meals", () => {
    expect(sumIntake([{ kcal: 500, protein: 19, carbs: 69, fat: 9.5 }, { kcal: 120.4, protein: 24, carbs: 3, fat: 1.5 }])).toEqual({ kcal: 620, protein: 43, carbs: 72, fat: 11, meals: 2 });
    expect(sumIntake([])).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0, meals: 0 });
  });
});

describe("resolveEstimate", () => {
  it("cleans items and keeps a confidence level", () => {
    const e = resolveEstimate({
      title: "Masala dosa",
      confidence: "medium",
      note: "Portion looks like one large dosa",
      items: [
        { name: "Masala dosa", portion: "1 large", kcal: 420, protein: 8, carbs: 58, fat: 17 },
        { name: "", portion: "", kcal: 10, protein: 0, carbs: 2, fat: 0 },
      ],
    })!;
    expect(e.items).toHaveLength(1);
    expect(e.confidence).toBe("medium");
  });

  it("treats unknown confidence as low and returns null with nothing usable", () => {
    expect(resolveEstimate({ title: "x", confidence: "certain", note: "", items: [{ name: "Tea", portion: "1 cup", kcal: 60, protein: 2, carbs: 8, fat: 2 }] })!.confidence).toBe("low");
    expect(resolveEstimate({ title: "x", confidence: "high", note: "", items: [] })).toBeNull();
  });
});

describe("confirmEstimate", () => {
  it("re-totals after edits and drops items set to zero", () => {
    const items = [
      { name: "Dosa", portion: "1", servings: 2, kcal: 200, protein: 4, carbs: 30, fat: 7 },
      { name: "Chutney", portion: "2 tbsp", servings: 0, kcal: 60, protein: 1, carbs: 3, fat: 5 },
    ];
    const log = confirmEstimate("breakfast", "Dosa", items)!;
    expect(log.items).toHaveLength(1);
    expect(log.totals.kcal).toBe(400);
  });

  it("returns null when everything was removed", () => {
    expect(confirmEstimate("snack", "x", [])).toBeNull();
  });
});

describe("estimate titles", () => {
  const items = [
    { name: "Roti (Phulka)", portion: "2", servings: 1, kcal: 160, protein: 5, carbs: 30, fat: 2 },
    { name: "Dal Tadka", portion: "1 katori", servings: 1, kcal: 180, protein: 9, carbs: 22, fat: 6 },
    { name: "Bhindi Sabzi", portion: "1 bowl", servings: 1, kcal: 120, protein: 3, carbs: 10, fat: 8 },
  ];

  it("builds a title from the foods", () => {
    expect(titleFromItems(items)).toBe("Roti, dal tadka and bhindi sabzi");
    expect(titleFromItems(items.slice(0, 1))).toBe("Roti");
  });

  it("spots titles that don't name any food", () => {
    expect(isGenericTitle("Estimated Meal", items)).toBe(true);
    expect(isGenericTitle("Indian Home Cooking Meal", items)).toBe(true);
    expect(isGenericTitle("Dal tadka with roti", items)).toBe(false);
  });

  it("replaces a generic model title", () => {
    const e = resolveEstimate({ title: "Estimated Meal", confidence: "high", note: "", items: items.map(({ name, portion, kcal, protein, carbs, fat }) => ({ name, portion, kcal, protein, carbs, fat })) })!;
    expect(e.title).toBe("Roti, dal tadka and bhindi sabzi");
  });
});

describe("backdated logging", () => {
  it("maps a date to its weekday", async () => {
    const { weekdayOfDateKey } = await import("./meal-log");
    expect(weekdayOfDateKey("2026-09-28")).toBe(0); // Monday
    expect(weekdayOfDateKey("2026-10-04")).toBe(6); // Sunday
  });

  it("allows only real dates in the backdating window", async () => {
    const { isAllowedLogDate } = await import("./meal-log");
    const today = "2026-10-03", earliest = "2026-09-03";
    expect(isAllowedLogDate("2026-10-03", today, earliest)).toBe(true);
    expect(isAllowedLogDate("2026-09-03", today, earliest)).toBe(true);
    expect(isAllowedLogDate("2026-10-04", today, earliest)).toBe(false);
    expect(isAllowedLogDate("2026-09-02", today, earliest)).toBe(false);
    expect(isAllowedLogDate("2026-02-30", today, "2026-01-01")).toBe(false);
    expect(isAllowedLogDate("yesterday", today, earliest)).toBe(false);
  });
});
