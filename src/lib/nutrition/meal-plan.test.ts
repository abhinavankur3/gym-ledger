import { describe, expect, it } from "vitest";
import { DISHES } from "./dish-catalog";
import { avoidFoodWords, cleanItem, dayTotal, fallbackMealPlan, resolveMealPlan, scaleDay, violatesDiet, type RawMealPlan } from "./meal-plan";

const item = (name: string, kcal = 300, protein = 15, carbs = 40, fat = 8) => ({ name, portion: "1 bowl", kcal, protein, carbs, fat });
const rawDay = (lunch: string, dinner = "Dal tadka") => ({
  meals: [
    { slot: "breakfast", title: "Poha", items: [item("Poha", 270, 6, 45, 7)] },
    { slot: "lunch", title: lunch, items: [item(lunch, 520, 25, 60, 18), item("Phulka", 200, 6, 40, 2)] },
    { slot: "dinner", title: dinner, items: [item(dinner, 450, 22, 50, 14)] },
  ],
});
const plan = (days: RawMealPlan["days"]): RawMealPlan => ({ name: "Test plan", days });
const target = { kcal: 2000 };

describe("violatesDiet", () => {
  it("blocks meat and fish for vegetarians, not eggplant or paneer", () => {
    const rules = { preference: "vegetarian" as const };
    expect(violatesDiet("Chicken curry", rules)).toBe(true);
    expect(violatesDiet("Fish fry", rules)).toBe(true);
    expect(violatesDiet("Egg bhurji", rules)).toBe(true);
    expect(violatesDiet("Baingan (eggplant) bharta", rules)).toBe(false);
    expect(violatesDiet("Paneer bhurji", rules)).toBe(false);
  });

  it("lets eggetarians have eggs but not meat", () => {
    const rules = { preference: "eggetarian" as const };
    expect(violatesDiet("Masala omelette", rules)).toBe(false);
    expect(violatesDiet("Mutton keema", rules)).toBe(true);
  });

  it("blocks dairy for vegans but allows plant milks and nut butters", () => {
    const rules = { preference: "vegan" as const };
    expect(violatesDiet("Paneer tikka", rules)).toBe(true);
    expect(violatesDiet("Jeera rice with ghee", rules)).toBe(true);
    expect(violatesDiet("Oats with almond milk", rules)).toBe(false);
    expect(violatesDiet("Toast with peanut butter", rules)).toBe(false);
  });

  it("blocks onion, garlic and root vegetables for Jain", () => {
    const rules = { preference: "jain" as const };
    expect(violatesDiet("Aloo gobi", rules)).toBe(true);
    expect(violatesDiet("Onion uttapam", rules)).toBe(true);
    expect(violatesDiet("Lauki chana dal", rules)).toBe(false);
  });

  it("applies the foods-to-avoid note, including allergen groups", () => {
    expect(violatesDiet("Peanut chikki", { preference: "none", avoidFoods: "peanuts" })).toBe(true);
    expect(violatesDiet("Poha with groundnuts", { preference: "none", avoidFoods: "peanut allergy" })).toBe(true);
    expect(violatesDiet("Phulka", { preference: "none", avoidFoods: "gluten" })).toBe(true);
    expect(violatesDiet("Masoor dal", { preference: "none", avoidFoods: "gluten" })).toBe(false);
    expect(violatesDiet("Mushroom masala", { preference: "none", avoidFoods: "I dislike mushrooms" })).toBe(true);
  });

  it("ignores filler words in the note", () => {
    expect(avoidFoodWords("please avoid any very spicy food")).toEqual(["spicy"]);
  });
});

describe("cleanItem", () => {
  it("recomputes kcal from macros when the stated value doesn't add up", () => {
    expect(cleanItem(item("Rajma", 900, 15, 40, 8))!.kcal).toBe(15 * 4 + 40 * 4 + 8 * 9);
  });

  it("keeps a stated kcal that roughly matches the macros", () => {
    expect(cleanItem(item("Rajma", 300, 15, 40, 8))!.kcal).toBe(300);
  });

  it("drops empty names and absurd values", () => {
    expect(cleanItem(item("", 300))).toBeNull();
    expect(cleanItem(item("Ghee", 5000, 0, 0, 560))).toBeNull();
    expect(cleanItem({ ...item("Rice"), kcal: Number.NaN, protein: -3, carbs: 45, fat: 1 })!.protein).toBe(0);
  });
});

describe("scaleDay", () => {
  it("scales portions toward the target in half servings", () => {
    const day = { meals: [{ slot: "lunch" as const, title: "x", items: [{ ...item("Rice", 500, 10, 100, 5), servings: 1 }] }] };
    const scaled = scaleDay(day, 1000);
    expect(scaled.meals[0].items[0].servings).toBe(1.5); // capped factor 1.6 → nearest half
  });

  it("leaves days within 10% alone", () => {
    const day = { meals: [{ slot: "lunch" as const, title: "x", items: [{ ...item("Rice", 950, 20, 180, 15), servings: 1 }] }] };
    expect(scaleDay(day, 1000)).toBe(day);
  });
});

describe("resolveMealPlan", () => {
  it("returns seven days, repeating valid ones", () => {
    const resolved = resolveMealPlan(plan([rawDay("Rajma chawal"), rawDay("Chole"), rawDay("Palak paneer")]), target, { preference: "vegetarian" })!;
    expect(resolved.days).toHaveLength(7);
    expect(resolved.days[3].meals[1].items[0].name).toBe("Rajma chawal");
  });

  it("removes dishes that break the diet and drops meals left empty", () => {
    const resolved = resolveMealPlan(plan([rawDay("Rajma chawal", "Chicken curry"), rawDay("Chole"), rawDay("Palak paneer")]), target, { preference: "vegetarian" })!;
    const names = resolved.days.flatMap((d) => d.meals.flatMap((m) => m.items.map((i) => i.name)));
    expect(names).not.toContain("Chicken curry");
    expect(resolved.days[0].meals.some((m) => m.slot === "dinner")).toBe(false);
  });

  it("returns null when too few days survive validation", () => {
    expect(resolveMealPlan(plan([rawDay("Chicken biryani", "Fish curry")]), target, { preference: "vegetarian" })).toBeNull();
  });

  it("ignores unknown meal slots", () => {
    const day = { meals: [...rawDay("Chole").meals, { slot: "midnight", title: "Cake", items: [item("Cake")] }] };
    const resolved = resolveMealPlan(plan([day, rawDay("Rajma"), rawDay("Dal")]), target, { preference: "none" })!;
    expect(resolved.days[0].meals.map((m) => m.slot)).toEqual(["breakfast", "lunch", "dinner"]);
  });

  it("scales each day toward the calorie target", () => {
    const resolved = resolveMealPlan(plan([rawDay("Chole"), rawDay("Rajma"), rawDay("Dal")]), { kcal: 2400 }, { preference: "none" })!;
    const kcal = dayTotal(resolved.days[0]).kcal;
    expect(Math.abs(kcal - 2400) / 2400).toBeLessThan(0.25);
  });
});

describe("fallbackMealPlan", () => {
  const prefs = ["none", "vegetarian", "vegan", "eggetarian", "jain"] as const;

  it("builds a full week for every diet in both regions", () => {
    for (const preference of prefs) {
      for (const countryCode of ["IN", "US"]) {
        const p = fallbackMealPlan({ kcal: 2200 }, { preference }, { countryCode });
        expect(p.days).toHaveLength(7);
        expect(p.days.every((d) => d.meals.some((m) => m.slot === "lunch") && d.meals.some((m) => m.slot === "dinner"))).toBe(true);
      }
    }
  });

  it("only uses dishes that fit the diet and avoid-list", () => {
    for (const preference of prefs) {
      const rules = { preference, avoidFoods: "peanuts" };
      const names = fallbackMealPlan({ kcal: 2000 }, rules, { countryCode: "IN" }).days.flatMap((d) => d.meals.flatMap((m) => m.items.map((i) => i.name)));
      expect(names.every((n) => !violatesDiet(n, rules))).toBe(true);
      const dishes = names.map((n) => DISHES.find((d) => d.name === n)!);
      expect(dishes.every((d) => !d.contains.includes("peanut"))).toBe(true);
    }
  });
});

describe("dish catalog", () => {
  it("has internally consistent numbers", () => {
    for (const d of DISHES) {
      const fromMacros = d.protein * 4 + d.carbs * 4 + d.fat * 9;
      expect(Math.abs(d.kcal - fromMacros) / fromMacros, d.id).toBeLessThanOrEqual(0.12);
    }
  });

  it("has unique ids", () => {
    expect(new Set(DISHES.map((d) => d.id)).size).toBe(DISHES.length);
  });
});
