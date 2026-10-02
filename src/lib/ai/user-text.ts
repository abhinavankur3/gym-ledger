/**
 * Helpers for free text the user types (plan feedback, things to avoid).
 * All of it is untrusted: it's cleaned, capped, and only ever passed to the
 * model as data, never as instructions.
 */

export const FEEDBACK_MAX = 600;
export const AVOID_MAX = 300;

/** Strips control characters, collapses whitespace and caps the length. */
export function sanitizeUserText(value: string | null | undefined, max: number) {
  return (value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Body areas people mention, mapped to the movement patterns that usually load them. */
const AREA_PATTERNS: Record<string, string[]> = {
  knee: ["squat", "lunge", "leg press", "leg extension", "step-up", "step up", "jump"],
  shoulder: ["overhead press", "shoulder press", "military press", "lateral raise", "upright row", "dip", "arnold"],
  "lower back": ["deadlift", "good morning", "barbell row", "back extension", "hyperextension"],
  back: ["deadlift", "good morning", "barbell row"],
  wrist: ["push-up", "push up", "front squat", "barbell curl"],
  elbow: ["skull crusher", "close-grip", "dip", "preacher curl"],
  hip: ["hip thrust", "lunge", "split squat"],
  neck: ["shrug", "upright row"],
};

const STOP_WORDS = new Set(["avoid", "please", "because", "with", "without", "dont", "don't", "cant", "can't", "hurts", "hurt", "pain", "painful", "feels", "uncomfortable", "injury", "injured", "sore", "the", "and", "any", "not", "like", "dislike", "hate", "only", "have", "exercise", "exercises", "movement", "movements", "fine", "okay", "good", "doing", "into", "more", "less", "heavy", "light"]);

/** Words too generic to exclude on their own ("press" would remove every press); fine inside a phrase. */
const GENERIC = new Set(["press", "raise", "curl", "row", "extension", "fly", "flye", "pull", "push", "barbell", "dumbbell", "cable", "machine", "chest", "leg", "arm", "upper", "lower", "body", "back"]);

/** "presses" → "press", "crunches" → "crunch", "squats" → "squat", "press" stays. */
const singular = (w: string) => (w.endsWith("ss") ? w : w.replace(/(sses|ches|shes|xes)$/, (m) => m.slice(0, -2)).replace(/s$/, ""));

/**
 * Exercise names to exclude for an "avoid" note. Matches exercises named directly
 * ("no deadlifts", "skip overhead press") and common body areas ("bad knee" → squats,
 * lunges…). Generic single words only count inside a longer phrase. Conservative by
 * design: it only ever removes options, never adds them.
 */
export function avoidedExercises(note: string | null | undefined, exerciseNames: string[]) {
  const text = sanitizeUserText(note, AVOID_MAX).toLowerCase();
  if (!text) return new Set<string>();

  const patterns = new Set<string>();
  for (const [area, movements] of Object.entries(AREA_PATTERNS)) {
    if (new RegExp(`\\b${area}s?\\b`).test(text)) movements.forEach((m) => patterns.add(m));
  }

  const words = text.split(/[^a-z-]+/).filter(Boolean).map(singular);
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (word.length >= 4 && !STOP_WORDS.has(word) && !GENERIC.has(word)) patterns.add(word);
    // Two- and three-word phrases, e.g. "overhead press", "romanian deadlift"
    for (const len of [2, 3]) {
      const phrase = words.slice(i, i + len);
      if (phrase.length === len && !phrase.some((w) => STOP_WORDS.has(w))) patterns.add(phrase.join(" "));
    }
  }

  const avoided = new Set<string>();
  for (const name of exerciseNames) {
    const lower = name.toLowerCase().split(/[^a-z-]+/).map(singular).join(" ");
    if ([...patterns].some((p) => lower.includes(p))) avoided.add(name);
  }
  return avoided;
}
