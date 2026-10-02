/**
 * Fallback dish set for Kochi meal plans. The AI generates meals freely; this small
 * catalog is only used to build a plan offline when the AI is unavailable or returns
 * invalid output, so it covers every diet tier, Jain, and each meal slot.
 *
 * Values are approximate per-serving estimates for typical home-style recipes
 * (moderate oil) and still need verifying against IFCT 2017 (Indian Food Composition
 * Tables) and USDA FoodData Central. kcal is derived from the macros (4/4/9).
 */

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";
/** Each tier allows everything in the tiers before it. */
export type DietTier = "vegan" | "vegetarian" | "eggetarian" | "nonveg";
export type Allergen = "dairy" | "gluten" | "peanut" | "tree-nut" | "soy" | "egg" | "fish" | "shellfish" | "sesame";
export type IndianRegion = "north" | "south" | "east" | "west";

export type Dish = {
  /** kebab-case slug, unique and stable (plans store it) */
  id: string;
  /** How a user would say it, e.g. "Masoor dal" */
  name: string;
  region: "IN" | "global";
  /** IN only; omitted for pan-Indian staples */
  subRegions?: IndianRegion[];
  /** Slots it's realistically eaten in */
  meals: MealSlot[];
  /** The most restrictive tier it fits */
  diet: DietTier;
  /** No onion, garlic, potato or other root vegetables, and no eggs or meat */
  jain: boolean;
  contains: Allergen[];
  /** One standard serving in household terms */
  serving: string;
  /** Grams for that serving (ml for drinks) */
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export const DISHES: Dish[] = [
  // India
  { id: "poha", name: "Poha", region: "IN", subRegions: ["west"], meals: ["breakfast", "snack"], diet: "vegan", jain: false, contains: ["peanut"], serving: "1 plate (150 g)", grams: 150, kcal: 241, protein: 4.5, carbs: 40, fat: 7 },
  { id: "rava-upma", name: "Rava upma", region: "IN", subRegions: ["south"], meals: ["breakfast"], diet: "vegan", jain: false, contains: ["gluten"], serving: "1 plate (180 g)", grams: 180, kcal: 246, protein: 5.5, carbs: 38, fat: 8 },
  { id: "idli", name: "Idli", region: "IN", subRegions: ["south"], meals: ["breakfast", "snack"], diet: "vegan", jain: true, contains: [], serving: "3 idlis (120 g)", grams: 120, kcal: 163, protein: 5.5, carbs: 34, fat: 0.6 },
  { id: "plain-dosa", name: "Plain dosa", region: "IN", subRegions: ["south"], meals: ["breakfast", "dinner"], diet: "vegan", jain: true, contains: [], serving: "1 large dosa (100 g)", grams: 100, kcal: 181, protein: 4, carbs: 30, fat: 5 },
  { id: "pesarattu", name: "Pesarattu (moong dosa)", region: "IN", subRegions: ["south"], meals: ["breakfast"], diet: "vegan", jain: false, contains: [], serving: "2 pesarattu (150 g)", grams: 150, kcal: 214, protein: 12, carbs: 28, fat: 6 },
  { id: "aloo-paratha", name: "Aloo paratha", region: "IN", subRegions: ["north"], meals: ["breakfast"], diet: "vegetarian", jain: false, contains: ["gluten", "dairy"], serving: "1 paratha (130 g)", grams: 130, kcal: 274, protein: 6, carbs: 40, fat: 10 },
  { id: "paneer-paratha", name: "Paneer paratha", region: "IN", subRegions: ["north"], meals: ["breakfast"], diet: "vegetarian", jain: false, contains: ["gluten", "dairy"], serving: "1 paratha (130 g)", grams: 130, kcal: 288, protein: 11, carbs: 34, fat: 12 },
  { id: "besan-chilla", name: "Besan chilla", region: "IN", subRegions: ["north"], meals: ["breakfast"], diet: "vegan", jain: false, contains: [], serving: "2 chillas (150 g)", grams: 150, kcal: 224, protein: 12, carbs: 26, fat: 8 },
  { id: "methi-thepla", name: "Methi thepla", region: "IN", subRegions: ["west"], meals: ["breakfast", "snack"], diet: "vegetarian", jain: true, contains: ["gluten", "dairy"], serving: "2 theplas (80 g)", grams: 80, kcal: 196, protein: 5, carbs: 26, fat: 8 },
  { id: "khaman-dhokla", name: "Khaman dhokla", region: "IN", subRegions: ["west"], meals: ["breakfast", "snack"], diet: "vegan", jain: true, contains: [], serving: "4 pieces (120 g)", grams: 120, kcal: 197, protein: 8, carbs: 30, fat: 5 },
  { id: "egg-bhurji", name: "Egg bhurji", region: "IN", meals: ["breakfast", "dinner"], diet: "eggetarian", jain: false, contains: ["egg"], serving: "2 eggs (130 g)", grams: 130, kcal: 185, protein: 13, carbs: 4, fat: 13 },
  { id: "masala-omelette", name: "Masala omelette", region: "IN", meals: ["breakfast"], diet: "eggetarian", jain: false, contains: ["egg"], serving: "2-egg omelette (120 g)", grams: 120, kcal: 172, protein: 13, carbs: 3, fat: 12 },
  { id: "phulka", name: "Phulka (roti)", region: "IN", meals: ["lunch", "dinner"], diet: "vegan", jain: true, contains: ["gluten"], serving: "2 medium phulkas (60 g)", grams: 60, kcal: 159, protein: 5.5, carbs: 32, fat: 1 },
  { id: "jowar-bhakri", name: "Jowar bhakri", region: "IN", subRegions: ["west"], meals: ["lunch", "dinner"], diet: "vegan", jain: true, contains: [], serving: "1 bhakri (60 g)", grams: 60, kcal: 186, protein: 5, carbs: 38, fat: 1.5 },
  { id: "steamed-rice", name: "Steamed rice", region: "IN", meals: ["lunch", "dinner"], diet: "vegan", jain: true, contains: [], serving: "1 katori cooked (150 g)", grams: 150, kcal: 186, protein: 3.5, carbs: 42, fat: 0.4 },
  { id: "dal-tadka", name: "Dal tadka (toor)", region: "IN", meals: ["lunch", "dinner"], diet: "vegan", jain: false, contains: [], serving: "1 katori (150 g)", grams: 150, kcal: 157, protein: 8, carbs: 20, fat: 5 },
  { id: "jain-moong-dal", name: "Moong dal (no onion or garlic)", region: "IN", meals: ["lunch", "dinner"], diet: "vegan", jain: true, contains: [], serving: "1 katori (150 g)", grams: 150, kcal: 138, protein: 8.5, carbs: 18, fat: 3.5 },
  { id: "sambar", name: "Sambar", region: "IN", subRegions: ["south"], meals: ["breakfast", "lunch", "dinner"], diet: "vegan", jain: false, contains: [], serving: "1 katori (150 g)", grams: 150, kcal: 107, protein: 5, carbs: 15, fat: 3 },
  { id: "rajma-masala", name: "Rajma masala", region: "IN", subRegions: ["north"], meals: ["lunch", "dinner"], diet: "vegan", jain: false, contains: [], serving: "1 katori (150 g)", grams: 150, kcal: 186, protein: 9, carbs: 24, fat: 6 },
  { id: "chole", name: "Chole (chana masala)", region: "IN", subRegions: ["north"], meals: ["lunch", "dinner"], diet: "vegan", jain: false, contains: [], serving: "1 katori (150 g)", grams: 150, kcal: 207, protein: 9, carbs: 27, fat: 7 },
  { id: "palak-paneer", name: "Palak paneer", region: "IN", subRegions: ["north"], meals: ["lunch", "dinner"], diet: "vegetarian", jain: false, contains: ["dairy"], serving: "1 katori (150 g)", grams: 150, kcal: 224, protein: 12, carbs: 8, fat: 16 },
  { id: "jain-matar-paneer", name: "Matar paneer (Jain style)", region: "IN", subRegions: ["north"], meals: ["lunch", "dinner"], diet: "vegetarian", jain: true, contains: ["dairy"], serving: "1 katori (150 g)", grams: 150, kcal: 209, protein: 11, carbs: 12, fat: 13 },
  { id: "soya-chunks-curry", name: "Soya chunks curry", region: "IN", meals: ["lunch", "dinner"], diet: "vegan", jain: false, contains: ["soy"], serving: "1 katori (150 g)", grams: 150, kcal: 182, protein: 18, carbs: 14, fat: 6 },
  { id: "bhindi-fry", name: "Bhindi fry", region: "IN", meals: ["lunch", "dinner"], diet: "vegan", jain: true, contains: [], serving: "1 katori (120 g)", grams: 120, kcal: 109, protein: 2.5, carbs: 9, fat: 7 },
  { id: "cabbage-matar", name: "Cabbage matar sabzi", region: "IN", meals: ["lunch", "dinner"], diet: "vegan", jain: true, contains: [], serving: "1 katori (150 g)", grams: 150, kcal: 103, protein: 3.5, carbs: 11, fat: 5 },
  { id: "chicken-curry", name: "Chicken curry (home-style)", region: "IN", subRegions: ["north"], meals: ["lunch", "dinner"], diet: "nonveg", jain: false, contains: [], serving: "1 katori with 3 pieces (180 g)", grams: 180, kcal: 246, protein: 24, carbs: 6, fat: 14 },
  { id: "kerala-fish-curry", name: "Kerala fish curry", region: "IN", subRegions: ["south"], meals: ["lunch", "dinner"], diet: "nonveg", jain: false, contains: ["fish"], serving: "1 katori with 2 pieces (180 g)", grams: 180, kcal: 212, protein: 20, carbs: 6, fat: 12 },
  { id: "macher-jhol", name: "Macher jhol (fish curry)", region: "IN", subRegions: ["east"], meals: ["lunch", "dinner"], diet: "nonveg", jain: false, contains: ["fish"], serving: "1 katori with 2 pieces (180 g)", grams: 180, kcal: 190, protein: 20, carbs: 5, fat: 10 },
  { id: "egg-curry", name: "Egg curry", region: "IN", meals: ["lunch", "dinner"], diet: "eggetarian", jain: false, contains: ["egg"], serving: "2 eggs with gravy (180 g)", grams: 180, kcal: 210, protein: 13, carbs: 8, fat: 14 },
  { id: "moong-dal-khichdi", name: "Moong dal khichdi", region: "IN", meals: ["lunch", "dinner"], diet: "vegetarian", jain: true, contains: ["dairy"], serving: "1 bowl (250 g)", grams: 250, kcal: 274, protein: 10, carbs: 45, fat: 6 },
  { id: "dahi", name: "Curd (dahi)", region: "IN", meals: ["lunch", "dinner", "snack"], diet: "vegetarian", jain: true, contains: ["dairy"], serving: "1 katori (150 g)", grams: 150, kcal: 93, protein: 5, carbs: 7, fat: 5 },
  { id: "cucumber-raita", name: "Cucumber raita", region: "IN", meals: ["lunch", "dinner"], diet: "vegetarian", jain: true, contains: ["dairy"], serving: "1 katori (150 g)", grams: 150, kcal: 82, protein: 4.5, carbs: 7, fat: 4 },
  { id: "cucumber-tomato-salad", name: "Cucumber tomato salad", region: "IN", meals: ["lunch", "dinner"], diet: "vegan", jain: true, contains: [], serving: "1 plate (100 g)", grams: 100, kcal: 26, protein: 1, carbs: 5, fat: 0.2 },
  { id: "banana", name: "Banana", region: "IN", meals: ["breakfast", "snack"], diet: "vegan", jain: true, contains: [], serving: "1 medium (120 g)", grams: 120, kcal: 117, protein: 1.3, carbs: 27, fat: 0.4 },
  { id: "sprouts-chaat", name: "Sprouts chaat", region: "IN", meals: ["breakfast", "snack"], diet: "vegan", jain: false, contains: [], serving: "1 bowl (150 g)", grams: 150, kcal: 158, protein: 11, carbs: 24, fat: 2 },
  { id: "roasted-chana", name: "Roasted chana", region: "IN", meals: ["snack"], diet: "vegan", jain: true, contains: [], serving: "1 handful (30 g)", grams: 30, kcal: 110, protein: 6, carbs: 18, fat: 1.6 },
  { id: "roasted-makhana", name: "Roasted makhana", region: "IN", meals: ["snack"], diet: "vegetarian", jain: true, contains: ["dairy"], serving: "1 bowl (25 g)", grams: 25, kcal: 108, protein: 2.5, carbs: 19, fat: 2.5 },
  { id: "chaas", name: "Chaas (buttermilk)", region: "IN", meals: ["lunch", "snack"], diet: "vegetarian", jain: true, contains: ["dairy"], serving: "1 glass (250 ml)", grams: 250, kcal: 52, protein: 3.5, carbs: 5, fat: 2 },
  { id: "boiled-eggs", name: "Boiled eggs", region: "IN", meals: ["breakfast", "snack"], diet: "eggetarian", jain: false, contains: ["egg"], serving: "2 eggs (100 g)", grams: 100, kcal: 150, protein: 12.6, carbs: 1, fat: 10.6 },
  { id: "mixed-nuts", name: "Mixed nuts (almonds, walnuts)", region: "IN", meals: ["snack"], diet: "vegan", jain: true, contains: ["tree-nut"], serving: "1 handful (25 g)", grams: 25, kcal: 166, protein: 5, carbs: 5, fat: 14 },
  { id: "whey-shake", name: "Whey protein shake", region: "IN", meals: ["breakfast", "snack"], diet: "vegetarian", jain: true, contains: ["dairy"], serving: "1 scoop in water (300 ml)", grams: 300, kcal: 122, protein: 24, carbs: 3, fat: 1.5 },

  // Global
  { id: "oatmeal-milk-banana", name: "Oatmeal with milk and banana", region: "global", meals: ["breakfast"], diet: "vegetarian", jain: true, contains: ["gluten", "dairy"], serving: "1 bowl (300 g)", grams: 300, kcal: 331, protein: 12, carbs: 55, fat: 7 },
  { id: "overnight-oats-plant", name: "Overnight oats with soy milk", region: "global", meals: ["breakfast"], diet: "vegan", jain: true, contains: ["gluten", "soy"], serving: "1 jar (250 g)", grams: 250, kcal: 312, protein: 10, carbs: 50, fat: 8 },
  { id: "scrambled-eggs", name: "Scrambled eggs", region: "global", meals: ["breakfast", "dinner"], diet: "eggetarian", jain: false, contains: ["egg", "dairy"], serving: "2 eggs (130 g)", grams: 130, kcal: 186, protein: 13, carbs: 2, fat: 14 },
  { id: "vegetable-omelette", name: "Vegetable omelette", region: "global", meals: ["breakfast"], diet: "eggetarian", jain: false, contains: ["egg"], serving: "2-egg omelette (150 g)", grams: 150, kcal: 176, protein: 13, carbs: 4, fat: 12 },
  { id: "greek-yogurt-berries", name: "Greek yogurt with berries", region: "global", meals: ["breakfast", "snack"], diet: "vegetarian", jain: true, contains: ["dairy"], serving: "1 bowl (200 g)", grams: 200, kcal: 197, protein: 18, carbs: 20, fat: 5 },
  { id: "wholegrain-toast", name: "Whole-grain toast", region: "global", meals: ["breakfast"], diet: "vegan", jain: true, contains: ["gluten"], serving: "2 slices (60 g)", grams: 60, kcal: 142, protein: 7, carbs: 24, fat: 2 },
  { id: "tofu-scramble", name: "Tofu scramble", region: "global", meals: ["breakfast", "dinner"], diet: "vegan", jain: false, contains: ["soy"], serving: "1 plate (180 g)", grams: 180, kcal: 204, protein: 18, carbs: 6, fat: 12 },
  { id: "grilled-chicken-breast", name: "Grilled chicken breast", region: "global", meals: ["lunch", "dinner"], diet: "nonveg", jain: false, contains: [], serving: "1 breast (150 g cooked)", grams: 150, kcal: 229, protein: 46, carbs: 0, fat: 5 },
  { id: "baked-salmon", name: "Baked salmon", region: "global", meals: ["lunch", "dinner"], diet: "nonveg", jain: false, contains: ["fish"], serving: "1 fillet (150 g)", grams: 150, kcal: 298, protein: 34, carbs: 0, fat: 18 },
  { id: "baked-tofu", name: "Baked tofu", region: "global", meals: ["lunch", "dinner"], diet: "vegan", jain: true, contains: ["soy"], serving: "150 g", grams: 150, kcal: 187, protein: 18, carbs: 4, fat: 11 },
  { id: "lentil-soup", name: "Lentil soup", region: "global", meals: ["lunch", "dinner"], diet: "vegan", jain: false, contains: [], serving: "1 bowl (300 g)", grams: 300, kcal: 241, protein: 14, carbs: 35, fat: 5 },
  { id: "black-beans", name: "Black beans", region: "global", meals: ["lunch", "dinner"], diet: "vegan", jain: true, contains: [], serving: "1 cup cooked (170 g)", grams: 170, kcal: 229, protein: 15, carbs: 40, fat: 1 },
  { id: "hard-boiled-eggs", name: "Hard-boiled eggs", region: "global", meals: ["breakfast", "snack"], diet: "eggetarian", jain: false, contains: ["egg"], serving: "2 eggs (100 g)", grams: 100, kcal: 150, protein: 12.6, carbs: 1, fat: 10.6 },
  { id: "white-rice", name: "White rice", region: "global", meals: ["lunch", "dinner"], diet: "vegan", jain: true, contains: [], serving: "1 cup cooked (160 g)", grams: 160, kcal: 201, protein: 4.3, carbs: 45, fat: 0.4 },
  { id: "wholewheat-pasta", name: "Whole-wheat pasta", region: "global", meals: ["lunch", "dinner"], diet: "vegan", jain: true, contains: ["gluten"], serving: "1 cup cooked (140 g)", grams: 140, kcal: 192, protein: 7.5, carbs: 37, fat: 1.5 },
  { id: "quinoa", name: "Quinoa", region: "global", meals: ["lunch", "dinner"], diet: "vegan", jain: true, contains: [], serving: "1 cup cooked (185 g)", grams: 185, kcal: 220, protein: 8, carbs: 39, fat: 3.5 },
  { id: "steamed-greens", name: "Steamed broccoli and green beans", region: "global", meals: ["lunch", "dinner"], diet: "vegan", jain: true, contains: [], serving: "1 cup (150 g)", grams: 150, kcal: 60, protein: 4, carbs: 10, fat: 0.5 },
  { id: "mixed-green-salad", name: "Mixed green salad", region: "global", meals: ["lunch", "dinner"], diet: "vegan", jain: true, contains: [], serving: "1 bowl with dressing (100 g)", grams: 100, kcal: 89, protein: 1.5, carbs: 5, fat: 7 },
  { id: "protein-shake", name: "Protein shake", region: "global", meals: ["breakfast", "snack"], diet: "vegetarian", jain: true, contains: ["dairy"], serving: "1 scoop in water (300 ml)", grams: 300, kcal: 122, protein: 24, carbs: 3, fat: 1.5 },
  { id: "almonds", name: "Almonds", region: "global", meals: ["snack"], diet: "vegan", jain: true, contains: ["tree-nut"], serving: "1 handful (28 g)", grams: 28, kcal: 174, protein: 6, carbs: 6, fat: 14 },
  { id: "mixed-berries", name: "Mixed berries", region: "global", meals: ["breakfast", "snack"], diet: "vegan", jain: true, contains: [], serving: "1 cup (150 g)", grams: 150, kcal: 81, protein: 1.2, carbs: 18, fat: 0.5 },
  { id: "edamame", name: "Edamame", region: "global", meals: ["snack"], diet: "vegan", jain: true, contains: ["soy"], serving: "1 cup shelled (155 g)", grams: 155, kcal: 200, protein: 18, carbs: 14, fat: 8 },
];
