/**
 * Deterministic set suggestions so a planned set can be logged with one tap.
 * Order of preference: what you just did in this workout → your last session
 * (with progressive overload) → the plan's targets.
 */

export type PastSet = {
  setNumber: number;
  setType: string;
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
};

export type Suggestion = {
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
  /** Why the numbers differ from last time, e.g. "+2.5 kg from last time" */
  hint?: string;
};

export type ExerciseKind = "weighted" | "bodyweight" | "duration";

const TIMED_EXERCISES = ["plank", "dead bug"];

export function exerciseKind(category: string, name: string): ExerciseKind {
  if (category === "cardio" || TIMED_EXERCISES.includes(name.toLowerCase())) return "duration";
  if (category === "bodyweight") return "bodyweight";
  return "weighted";
}

/** "8-12" → { min: 8, max: 12 }, "10" → { min: 10, max: 10 }, anything else → null */
export function parseRepRange(targetReps: string | null | undefined) {
  if (!targetReps) return null;
  const match = targetReps.match(/^\s*(\d+)\s*(?:[-–]\s*(\d+))?\s*$/);
  if (!match) return null;
  const min = Number(match[1]);
  const max = match[2] ? Number(match[2]) : min;
  return { min: Math.min(min, max), max: Math.max(min, max) };
}

/** Smallest sensible jump: 2.5 kg for barbell/machine/cable, 2 kg for dumbbells. */
export function weightIncrement(category: string) {
  return category === "dumbbell" ? 2 : 2.5;
}

const DEFAULT_DURATION_SECONDS = 60;

export function suggestSet({
  setIndex,
  kind,
  category,
  targetReps,
  targetWeight,
  doneThisWorkout,
  lastSession,
}: {
  setIndex: number;
  kind: ExerciseKind;
  category: string;
  targetReps: string | null | undefined;
  targetWeight: number | null | undefined;
  /** Working sets already logged for this exercise in the current workout, in order */
  doneThisWorkout: PastSet[];
  /** Working sets from the most recent previous workout with this exercise */
  lastSession: PastSet[];
}): Suggestion {
  const range = parseRepRange(targetReps);

  // 1. Carry forward the most recent set from this workout — the user's own adjustment wins.
  const previousHere = doneThisWorkout.at(-1);
  if (previousHere) {
    return { weight: previousHere.weight, reps: previousHere.reps, durationSeconds: previousHere.durationSeconds };
  }

  // 2. Last session, matching set number where possible.
  if (lastSession.length) {
    const match = lastSession[Math.min(setIndex, lastSession.length - 1)];
    if (kind === "duration") return { weight: null, reps: null, durationSeconds: match.durationSeconds ?? range?.max ?? DEFAULT_DURATION_SECONDS };

    // Progressive overload: every set hit the top of the range → add weight, restart at the bottom.
    const hitTop = range && lastSession.every((s) => (s.reps ?? 0) >= range.max);
    if (hitTop && kind === "weighted" && match.weight) {
      const step = weightIncrement(category);
      return { weight: match.weight + step, reps: range.min, durationSeconds: null, hint: `+${step} kg from last time` };
    }
    if (hitTop && kind === "bodyweight") {
      return { weight: match.weight, reps: (match.reps ?? range.max) + 1, durationSeconds: null, hint: "+1 rep from last time" };
    }
    return { weight: match.weight, reps: match.reps ?? range?.min ?? null, durationSeconds: null };
  }

  // 3. Plan targets. For timed exercises the plan's "reps" number is seconds.
  if (kind === "duration") return { weight: null, reps: null, durationSeconds: range?.max ?? DEFAULT_DURATION_SECONDS };
  return { weight: targetWeight ?? null, reps: range?.min ?? null, durationSeconds: null };
}

/** A weighted set with no known weight can't be logged blind; the user picks it once. */
export function needsInput(kind: ExerciseKind, s: Suggestion) {
  if (kind === "duration") return !s.durationSeconds;
  if (kind === "weighted") return s.weight == null || s.reps == null;
  return s.reps == null;
}
