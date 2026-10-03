/**
 * Meal plan rules. The model writes dishes freely; code makes the plan safe and
 * consistent: diet compliance, the user's avoid-list, sane numbers, seven days,
 * and portions scaled to the calorie target. Also builds the offline fallback
 * plan from the small dish set. Pure — unit-tested directly.
 */
import { DISHES, type Dish, type MealSlot } from "./dish-catalog";
import type { NutritionTargets } from "./targets";

export const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "snack", "dinner"];
export const SLOT_LABEL: Record<MealSlot, string> = { breakfast: "Breakfast", lunch: "Lunch", snack: "Snack", dinner: "Dinner" };

export type MealItem = {
  name: string;
  /** One serving in household terms, e.g. "2 medium rotis" */
  portion: string;
  /** Multiplier applied when scaling to the target; 1 = one portion as written */
  servings: number;
  /** Per single serving */
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};
export type Meal = { slot: MealSlot; title: string; items: MealItem[] };
export type MealDay = { meals: Meal[] };
export type MealPlan = { name: string; days: MealDay[] };

/** What the model returns before validation. */
export type RawMealPlan = {
  name: string;
  days: Array<{ meals: Array<{ slot: string; title: string; items: Array<{ name: string; portion: string; kcal: number; protein: number; carbs: number; fat: number }> }> }>;
};

export type DietPreference = "none" | "vegetarian" | "vegan" | "eggetarian" | "jain";
export type DietRules = { preference: DietPreference; avoidFoods?: string | null };

// ---------------------------------------------------------------- diet rules

const MEAT = ["chicken", "mutton", "lamb", "goat", "beef", "pork", "bacon", "ham", "sausage", "salami", "pepperoni", "keema", "kheema", "meat", "turkey", "duck", "fish", "prawn", "prawns", "shrimp", "crab", "lobster", "tuna", "salmon", "sardine", "mackerel", "pomfret", "rohu", "hilsa", "surmai", "bangda", "anchovy", "squid", "octopus", "seafood", "kebab", "tikka chicken", "gelatin"];
const EGG = ["egg", "eggs", "omelette", "omelet", "anda", "mayonnaise", "mayo", "frittata", "shakshuka"];
const DAIRY = ["milk", "paneer", "curd", "dahi", "yogurt", "yoghurt", "ghee", "butter", "cheese", "cream", "lassi", "raita", "whey", "buttermilk", "chaas", "khoa", "khoya", "kheer", "honey", "malai", "kulfi", "shrikhand", "rabri", "basundi", "custard", "chhena", "rasgulla"];
const ROOTS = ["onion", "onions", "garlic", "potato", "potatoes", "aloo", "carrot", "carrots", "beetroot", "beet", "radish", "mooli", "ginger", "adrak", "sweet potato", "shakarkandi", "turnip", "yam", "arbi", "colocasia", "leek", "spring onion", "shallot", "shallots", "suran"];
/** Plant-based phrases that contain a dairy word but aren't dairy */
const PLANT_EXCEPTIONS = ["soy milk", "soya milk", "almond milk", "oat milk", "coconut milk", "cashew milk", "rice milk", "peanut butter", "almond butter", "nut butter", "cocoa butter", "coconut cream", "vegan", "plant-based", "tofu curd", "coconut yogurt", "soy yogurt"];

/** Common allergens and the dish words that usually mean them */
const AVOID_GROUPS: Record<string, string[]> = {
  peanut: ["peanut", "peanuts", "groundnut", "groundnuts", "chikki", "moongphali"],
  nut: ["almond", "almonds", "cashew", "cashews", "kaju", "badam", "walnut", "walnuts", "pistachio", "pista", "hazelnut", "nuts", "pecan"],
  dairy: DAIRY,
  lactose: DAIRY,
  milk: DAIRY,
  gluten: ["wheat", "roti", "rotis", "chapati", "chapatis", "phulka", "phulkas", "paratha", "parathas", "naan", "bread", "toast", "pasta", "atta", "maida", "semolina", "suji", "sooji", "rava", "upma", "daliya", "dalia", "couscous", "barley", "poori", "puri", "kulcha", "bhatura", "thepla", "noodles", "sandwich", "wrap", "tortilla", "seviyan"],
  wheat: ["wheat", "roti", "chapati", "phulka", "paratha", "atta", "maida", "bread"],
  egg: EGG,
  fish: ["fish", "tuna", "salmon", "sardine", "mackerel", "pomfret", "rohu", "hilsa", "surmai", "bangda", "anchovy"],
  seafood: ["fish", "prawn", "prawns", "shrimp", "crab", "lobster", "squid", "octopus", "seafood", "tuna", "salmon"],
  shellfish: ["prawn", "prawns", "shrimp", "crab", "lobster", "shellfish"],
  soy: ["soy", "soya", "tofu", "edamame", "tempeh"],
  sesame: ["sesame", "til", "tahini"],
};

const AVOID_STOP = new Set(["and", "the", "any", "all", "food", "foods", "allergy", "allergic", "avoid", "dislike", "don't", "dont", "like", "not", "without", "with", "please", "eat", "much", "too", "very", "some", "also", "only", "dishes", "dish", "intolerant", "intolerance", "free"]);

const hasWord = (text: string, word: string) => new RegExp(`(^|[^a-z])${word.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}($|[^a-z])`).test(text);

function blockedWords(preference: DietPreference) {
  if (preference === "vegan") return [...MEAT, ...EGG, ...DAIRY];
  if (preference === "vegetarian") return [...MEAT, ...EGG];
  if (preference === "jain") return [...MEAT, ...EGG, ...ROOTS];
  if (preference === "eggetarian") return MEAT;
  return [];
}

/** Words from the user's "foods to avoid" note, expanded through allergen groups. */
export function avoidFoodWords(note: string | null | undefined) {
  const text = (note ?? "").toLowerCase().replace(/[\u0000-\u001F\u007F]/g, " ").slice(0, 300);
  const words = new Set<string>();
  for (const [group, members] of Object.entries(AVOID_GROUPS)) {
    if (hasWord(text, group) || hasWord(text, `${group}s`)) members.forEach((m) => words.add(m));
  }
  for (const token of text.split(/[^a-z-]+/)) {
    if (token.length >= 3 && !AVOID_STOP.has(token)) words.add(token.replace(/s$/, ""));
  }
  return [...words];
}

/** True when a dish name breaks the diet or the avoid-list. */
export function violatesDiet(name: string, rules: DietRules, avoidWords = avoidFoodWords(rules.avoidFoods)) {
  let text = name.toLowerCase();
  const blocked = blockedWords(rules.preference);
  if (rules.preference === "vegan") for (const phrase of PLANT_EXCEPTIONS) text = text.replaceAll(phrase, " ");
  if (blocked.some((w) => hasWord(text, w))) return true;
  const original = name.toLowerCase();
  return avoidWords.some((w) => hasWord(original, w) || hasWord(original, `${w}s`));
}

// ---------------------------------------------------------------- numbers

export function cleanLabel(value: string, max: number) {
  return value.replace(/<[^>]*>/g, " ").replace(/[^\p{L}\p{N} ()&'/,.+%½¼¾-]/gu, "").replace(/\s+/g, " ").trim().slice(0, max);
}

const macroKcal = (p: number, c: number, f: number) => p * 4 + c * 4 + f * 9;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Cleans one model item; trusts the macros over a stated kcal that doesn't add up. */
export function cleanItem(item: RawMealPlan["days"][number]["meals"][number]["items"][number]): MealItem | null {
  const name = cleanLabel(String(item.name ?? ""), 60);
  if (name.length < 2) return null;
  const protein = r1(num(item.protein));
  const carbs = r1(num(item.carbs));
  const fat = r1(num(item.fat));
  const fromMacros = macroKcal(protein, carbs, fat);
  let kcal = Math.round(num(item.kcal));
  if (fromMacros > 0 && Math.abs(kcal - fromMacros) / fromMacros > 0.15) kcal = Math.round(fromMacros);
  if (kcal < 5 || kcal > 2000) return null;
  return { name, portion: cleanLabel(String(item.portion ?? ""), 40) || "1 serving", servings: 1, kcal, protein, carbs, fat };
}

export type Totals = { kcal: number; protein: number; carbs: number; fat: number };

export function itemsTotal(items: MealItem[]): Totals {
  return items.reduce(
    (t, i) => ({ kcal: t.kcal + i.kcal * i.servings, protein: t.protein + i.protein * i.servings, carbs: t.carbs + i.carbs * i.servings, fat: t.fat + i.fat * i.servings }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function dayTotal(day: MealDay): Totals {
  return itemsTotal(day.meals.flatMap((m) => m.items));
}

/**
 * Scales a day's portions toward the calorie target in half-serving steps,
 * leaving it alone when it's already within 10%.
 */
export function scaleDay(day: MealDay, targetKcal: number): MealDay {
  const total = dayTotal(day).kcal;
  if (!total || Math.abs(total - targetKcal) / targetKcal <= 0.1) return day;
  const factor = Math.min(1.6, Math.max(0.6, targetKcal / total));
  return {
    meals: day.meals.map((meal) => ({
      ...meal,
      items: meal.items.map((item) => ({ ...item, servings: Math.max(0.5, Math.round(item.servings * factor * 2) / 2) })),
    })),
  };
}

// ---------------------------------------------------------------- protein shake

/** Meals are planned to this share of daily calories and protein; a protein shake covers the protein gap. */
export const MEAL_SHARE = 0.8;
const MAX_SCOOPS = 2;
const MIN_GAP_GRAMS = 8;

export const PROTEIN_POWDERS = {
  whey: { name: "Whey protein shake", portion: "1 scoop (30 g) in water", kcal: 120, protein: 24, carbs: 3, fat: 1.5 },
  plant: { name: "Plant protein shake (pea)", portion: "1 scoop (33 g) in water", kcal: 125, protein: 22, carbs: 3, fat: 2 },
} as const;

export function isProteinPowder(name: string) {
  return /\bwhey\b|protein (shake|powder|smoothie)|protein scoop/i.test(name);
}

/** Which powder fits the diet, or null when the user wants none. */
export function choosePowder(rules: DietRules): keyof typeof PROTEIN_POWDERS | null {
  const note = (rules.avoidFoods ?? "").toLowerCase();
  if (/\b(whey|protein powders?|protein shakes?|supplements?)\b/.test(note)) return null;
  if (rules.preference === "vegan" || /\b(dairy|lactose|milk)\b/.test(note)) return "plant";
  return "whey";
}

/** Adds a protein shake sized to the day's protein gap (half-scoop steps, up to 2 scoops) to the snack. */
export function addProteinShake(day: MealDay, proteinTarget: number, rules: DietRules): MealDay {
  const kind = choosePowder(rules);
  if (!kind) return day;
  const gap = proteinTarget - dayTotal(day).protein;
  if (gap < MIN_GAP_GRAMS) return day;
  const powder = PROTEIN_POWDERS[kind];
  const scoops = Math.min(MAX_SCOOPS, Math.max(0.5, Math.round((gap / powder.protein) * 2) / 2));
  const shake: MealItem = { ...powder, servings: scoops };
  const meals = day.meals.map((m) => ({ ...m, items: [...m.items] }));
  const snack = meals.find((m) => m.slot === "snack");
  if (snack) snack.items.push(shake);
  else meals.push({ slot: "snack", title: "Protein shake", items: [shake] });
  meals.sort((a, b) => MEAL_SLOTS.indexOf(a.slot) - MEAL_SLOTS.indexOf(b.slot));
  return { meals };
}

/** Meals scaled to 80% of calories, then the protein shake on top. */
export function finishDay(day: MealDay, targets: Pick<NutritionTargets, "kcal" | "protein">, rules: DietRules): MealDay {
  return addProteinShake(scaleDay(day, targets.kcal * MEAL_SHARE), targets.protein, rules);
}

/**
 * A finished day (meals + shake) must land in a sane range: not below max(1200 kcal,
 * 70% of target) — capped at 90% of target so low targets aren't rejected outright —
 * and not above 120% of target. Stops "500 kcal fasting day" feedback or bloated
 * model days from reaching the user.
 */
export function isSafeDay(day: MealDay, targets: Pick<NutritionTargets, "kcal">) {
  const total = dayTotal(day).kcal;
  const floor = Math.min(Math.max(1200, targets.kcal * 0.7), targets.kcal * 0.9);
  return total >= floor && total <= targets.kcal * 1.2;
}

/** One meal per slot: duplicate slots (two snacks) are merged so logging by slot is unambiguous. */
export function mergeSlots(meals: Meal[]): Meal[] {
  const bySlot = new Map<MealSlot, Meal>();
  for (const meal of meals) {
    const existing = bySlot.get(meal.slot);
    if (!existing) bySlot.set(meal.slot, { ...meal, items: [...meal.items] });
    else bySlot.set(meal.slot, { slot: meal.slot, title: cleanLabel(`${existing.title}, ${meal.title}`, 80), items: [...existing.items, ...meal.items] });
  }
  return MEAL_SLOTS.filter((slot) => bySlot.has(slot)).map((slot) => bySlot.get(slot)!);
}

// ---------------------------------------------------------------- resolve

/** Validates a model plan; returns null when it's unusable so the caller falls back. */
export function resolveMealPlan(raw: RawMealPlan, targets: Pick<NutritionTargets, "kcal" | "protein">, rules: DietRules): MealPlan | null {
  const avoidWords = avoidFoodWords(rules.avoidFoods);
  const days: MealDay[] = [];

  for (const rawDay of raw.days ?? []) {
    const meals: Meal[] = [];
    for (const rawMeal of rawDay.meals ?? []) {
      const slot = MEAL_SLOTS.find((s) => s === rawMeal.slot);
      if (!slot) continue;
      const title = cleanLabel(String(rawMeal.title ?? ""), 80);
      if (title && violatesDiet(title, rules, avoidWords)) continue;
      const items = (rawMeal.items ?? [])
        .map(cleanItem)
        // Protein powder is added by code, sized to the gap; drop any the model included
        .filter((i): i is MealItem => !!i && !isProteinPowder(i.name) && !violatesDiet(i.name, rules, avoidWords));
      if (items.length) meals.push({ slot, title: title || items.map((i) => i.name).join(", "), items });
    }
    const merged = mergeSlots(meals);
    const hasMain = merged.some((m) => m.slot === "lunch" || m.slot === "dinner");
    if (merged.length >= 2 && hasMain) days.push({ meals: merged });
  }

  // Finish (scale + shake) each distinct day, then keep only days in a safe calorie range
  const finished = days.map((d) => finishDay(d, targets, rules)).filter((d) => isSafeDay(d, targets));
  if (finished.length < 3) return null;
  // Short weeks repeat the valid days in order to make seven
  const week = Array.from({ length: 7 }, (_, i) => finished[i % finished.length]);
  return { name: cleanLabel(String(raw.name ?? ""), 60) || "Your meal plan", days: week };
}

// ---------------------------------------------------------------- fallback

const TIER_ORDER = ["vegan", "vegetarian", "eggetarian", "nonveg"] as const;

function dishAllowed(dish: Dish, rules: DietRules, avoidWords: string[]) {
  const tier = rules.preference === "none" ? "nonveg" : rules.preference === "jain" ? "vegetarian" : rules.preference;
  if (TIER_ORDER.indexOf(dish.diet) > TIER_ORDER.indexOf(tier)) return false;
  if (rules.preference === "jain" && !dish.jain) return false;
  if (avoidWords.length && dish.contains.some((a) => avoidWords.some((w) => a.startsWith(w) || w.startsWith(a.replace("tree-", ""))))) return false;
  return !violatesDiet(dish.name, rules, avoidWords);
}

const dishToItem = (d: Dish): MealItem => ({ name: d.name, portion: d.serving, servings: 1, kcal: d.kcal, protein: d.protein, carbs: d.carbs, fat: d.fat });

/** Offline plan from the fallback dish set, rotated for variety and scaled to target. */
export function fallbackMealPlan(targets: Pick<NutritionTargets, "kcal" | "protein">, rules: DietRules, opts: { countryCode?: string | null; indianRegion?: string | null } = {}): MealPlan {
  const avoidWords = avoidFoodWords(rules.avoidFoods);
  const region = opts.countryCode === "IN" ? "IN" : "global";
  const pool = DISHES.filter((d) => d.region === region && !isProteinPowder(d.name) && dishAllowed(d, rules, avoidWords))
    // Prefer the chosen sub-region, then pan-Indian staples
    .sort((a, b) => Number(!!b.subRegions?.includes(opts.indianRegion as never)) - Number(!!a.subRegions?.includes(opts.indianRegion as never)));
  const bySlot = (slot: MealSlot) => pool.filter((d) => d.meals.includes(slot));
  const byProtein = (list: Dish[]) => [...list].sort((a, b) => b.protein - a.protein);

  const pick = (list: Dish[], n: number, offset: number) => {
    if (!list.length) return [];
    const out: Dish[] = [];
    for (let i = 0; out.length < Math.min(n, list.length) && i < list.length * 2; i++) {
      const d = list[(offset + i) % list.length];
      if (!out.includes(d)) out.push(d);
    }
    return out;
  };

  const days: MealDay[] = Array.from({ length: 7 }, (_, day) => {
    const mains = bySlot("lunch").concat(bySlot("dinner").filter((d) => !d.meals.includes("lunch")));
    const proteinMains = byProtein(mains);
    const meals: Meal[] = [];
    const breakfast = pick(byProtein(bySlot("breakfast")), 1, day);
    if (breakfast.length) meals.push({ slot: "breakfast", title: breakfast[0].name, items: breakfast.map(dishToItem) });
    const lunch = [...pick(proteinMains.slice(0, Math.max(3, Math.ceil(proteinMains.length / 3))), 1, day), ...pick(mains, 2, day * 2 + 1)];
    const lunchUnique = lunch.filter((d, i) => lunch.indexOf(d) === i).slice(0, 3);
    if (lunchUnique.length) meals.push({ slot: "lunch", title: lunchUnique.map((d) => d.name).join(", "), items: lunchUnique.map(dishToItem) });
    const snack = pick(byProtein(bySlot("snack")), 1, day);
    if (snack.length) meals.push({ slot: "snack", title: snack[0].name, items: snack.map(dishToItem) });
    const dinner = [...pick(proteinMains.slice(0, Math.max(3, Math.ceil(proteinMains.length / 3))), 1, day + 2), ...pick(mains, 2, day * 2 + 5)];
    const dinnerUnique = dinner.filter((d, i) => dinner.indexOf(d) === i).slice(0, 3);
    if (dinnerUnique.length) meals.push({ slot: "dinner", title: dinnerUnique.map((d) => d.name).join(", "), items: dinnerUnique.map(dishToItem) });
    return finishDay({ meals: mergeSlots(meals) }, targets, rules);
  });

  return { name: region === "IN" ? "Everyday Indian plan" : "Everyday plan", days };
}
