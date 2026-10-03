import { describe, expect, it } from "vitest";
import { DISHES } from "./dish-catalog";
import { MEAL_SHARE, PROTEIN_POWDERS, addProteinShake, isSafeDay, mergeSlots, avoidFoodWords, choosePowder, cleanItem, dayTotal, fallbackMealPlan, resolveMealPlan, scaleDay, violatesDiet, type RawMealPlan } from "./meal-plan";

const item = (name: string, kcal = 300, protein = 15, carbs = 40, fat = 8) => ({ name, portion: "1 bowl", kcal, protein, carbs, fat });
const rawDay = (lunch: string, dinner = "Dal tadka") => ({
  meals: [
    { slot: "breakfast", title: "Poha", items: [item("Poha", 270, 6, 45, 7)] },
    { slot: "lunch", title: lunch, items: [item(lunch, 520, 25, 60, 18), item("Phulka", 200, 6, 40, 2)] },
    { slot: "dinner", title: dinner, items: [item(dinner, 450, 22, 50, 14)] },
  ],
});
const plan = (days: RawMealPlan["days"]): RawMealPlan => ({ name: "Test plan", days });
const target = { kcal: 2000, protein: 120 };

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
    const resolved = resolveMealPlan(plan([day, rawDay("Rajma"), rawDay("Dal")]), { kcal: 2000, protein: 0 }, { preference: "none" })!;
    expect(resolved.days[0].meals.map((m) => m.slot)).toEqual(["breakfast", "lunch", "dinner"]);
  });

  it("scales each day toward the calorie target", () => {
    const resolved = resolveMealPlan(plan([rawDay("Chole"), rawDay("Rajma"), rawDay("Dal")]), { kcal: 2400, protein: 0 }, { preference: "none" })!;
    // Meals are planned to 80% of the day; protein 0 means no shake is added
    const kcal = dayTotal(resolved.days[0]).kcal;
    expect(Math.abs(kcal - 2400 * MEAL_SHARE) / (2400 * MEAL_SHARE)).toBeLessThan(0.25);
  });
});

describe("fallbackMealPlan", () => {
  const prefs = ["none", "vegetarian", "vegan", "eggetarian", "jain"] as const;

  it("builds a full week for every diet in both regions", () => {
    for (const preference of prefs) {
      for (const countryCode of ["IN", "US"]) {
        const p = fallbackMealPlan({ kcal: 2200, protein: 130 }, { preference }, { countryCode });
        expect(p.days).toHaveLength(7);
        expect(p.days.every((d) => d.meals.some((m) => m.slot === "lunch") && d.meals.some((m) => m.slot === "dinner"))).toBe(true);
      }
    }
  });

  it("only uses dishes that fit the diet and avoid-list", () => {
    for (const preference of prefs) {
      const rules = { preference, avoidFoods: "peanuts" };
      const names = fallbackMealPlan({ kcal: 2000, protein: 120 }, rules, { countryCode: "IN" }).days.flatMap((d) => d.meals.flatMap((m) => m.items.map((i) => i.name)));
      expect(names.every((n) => !violatesDiet(n, rules))).toBe(true);
      const dishes = names.filter((n) => !Object.values(PROTEIN_POWDERS).some((p) => p.name === n)).map((n) => DISHES.find((d) => d.name === n)!);
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

describe("protein shake", () => {
  const day = { meals: [{ slot: "lunch" as const, title: "Dal rice", items: [{ ...item("Dal rice", 600, 30, 90, 12), servings: 1 }] }] };

  it("fills the protein gap in half-scoop steps, capped at two scoops", () => {
    const withShake = addProteinShake(day, 60, { preference: "none" });
    const shake = withShake.meals.find((m) => m.slot === "snack")!.items[0];
    expect(shake.name).toBe("Whey protein shake");
    expect(shake.servings).toBe(1.5); // 30 g gap / 24 g per scoop = 1.25 → nearest half, rounding up
    expect(addProteinShake(day, 200, { preference: "none" }).meals.find((m) => m.slot === "snack")!.items[0].servings).toBe(2);
  });

  it("skips the shake when meals already cover protein", () => {
    expect(addProteinShake(day, 35, { preference: "none" })).toBe(day);
  });

  it("uses plant protein for vegans and dairy-free, and none when asked", () => {
    expect(choosePowder({ preference: "vegan" })).toBe("plant");
    expect(choosePowder({ preference: "none", avoidFoods: "lactose intolerant" })).toBe("plant");
    expect(choosePowder({ preference: "none", avoidFoods: "no protein powder please" })).toBeNull();
    expect(choosePowder({ preference: "jain" })).toBe("whey");
  });

  it("drops protein powder the model put in meals and adds Kochi's own", () => {
    const raw = plan([rawDay("Chole"), rawDay("Rajma"), rawDay("Dal")]);
    raw.days[0].meals[0].items.push(item("Whey protein shake", 120, 24, 3, 1.5));
    const resolved = resolveMealPlan(raw, { kcal: 2000, protein: 160 }, { preference: "none" })!;
    const shakes = resolved.days[0].meals.flatMap((m) => m.items).filter((i) => /protein shake/i.test(i.name));
    expect(shakes).toHaveLength(1);
    expect(resolved.days[0].meals.find((m) => m.slot === "snack")).toBeDefined();
  });

  it("fallback plans get the shake too", () => {
    const p = fallbackMealPlan({ kcal: 2400, protein: 170 }, { preference: "vegetarian" }, { countryCode: "IN" });
    expect(p.days.every((d) => d.meals.some((m) => m.items.some((i) => i.name === "Whey protein shake")))).toBe(true);
  });
});

describe("slot merging and day safety", () => {
  it("merges duplicate slots into one meal", () => {
    const merged = mergeSlots([
      { slot: "snack", title: "Fruit", items: [{ ...item("Apple", 80, 0, 20, 0), servings: 1 }] },
      { slot: "lunch", title: "Dal rice", items: [{ ...item("Dal rice"), servings: 1 }] },
      { slot: "snack", title: "Chana", items: [{ ...item("Roasted chana", 110, 6, 18, 2), servings: 1 }] },
    ]);
    expect(merged.map((m) => m.slot)).toEqual(["lunch", "snack"]);
    expect(merged[1].items).toHaveLength(2);
    expect(merged[1].title).toBe("Fruit, Chana");
  });

  it("resolves a model day with two snacks into a single snack", () => {
    const day = rawDay("Chole");
    day.meals.push({ slot: "snack", title: "Fruit", items: [item("Apple", 80, 0, 20, 0)] }, { slot: "snack", title: "Chana", items: [item("Chana", 110, 6, 18, 2)] });
    const resolved = resolveMealPlan(plan([day, rawDay("Rajma"), rawDay("Dal")]), { kcal: 1800, protein: 0 }, { preference: "none" })!;
    expect(resolved.days[0].meals.filter((m) => m.slot === "snack")).toHaveLength(1);
  });

  it("flags days far outside the target", () => {
    const day = (kcal: number) => ({ meals: [{ slot: "lunch" as const, title: "x", items: [{ ...item("x", kcal, 10, 10, 10), servings: 1 }] }] });
    expect(isSafeDay(day(1900), { kcal: 2000 })).toBe(true);
    expect(isSafeDay(day(900), { kcal: 2000 })).toBe(false);
    expect(isSafeDay(day(2600), { kcal: 2000 })).toBe(false);
    // Low targets aren't rejected just for being under 1200
    expect(isSafeDay(day(1150), { kcal: 1250 })).toBe(true);
  });

  it("rejects a plan when feedback pushes every day far below target", () => {
    const tiny = (name: string) => ({ meals: [{ slot: "lunch", title: name, items: [item(name, 150, 5, 20, 3)] }, { slot: "dinner", title: name, items: [item(name, 150, 5, 20, 3)] }] });
    expect(resolveMealPlan(plan([tiny("Soup"), tiny("Salad"), tiny("Broth")]), { kcal: 2400, protein: 0 }, { preference: "none" })).toBeNull();
  });
});
