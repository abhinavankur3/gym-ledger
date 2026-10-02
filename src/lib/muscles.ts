/**
 * Muscle groups are coloured by movement pattern:
 * push = coral, pull = sky, legs = leaf, core = sun. Each session takes the colour
 * of the pattern that dominates it, the way a fruit gets its own colour in a menu.
 */
export type MuscleRegion = "push" | "pull" | "legs" | "core" | "other";
export type SessionTone = "push" | "pull" | "legs" | "sun";

const REGION: Record<string, MuscleRegion> = {
  chest: "push",
  shoulders: "push",
  triceps: "push",
  back: "pull",
  biceps: "pull",
  forearms: "pull",
  quads: "legs",
  hamstrings: "legs",
  glutes: "legs",
  calves: "legs",
  legs: "legs",
  core: "core",
};

export function muscleRegion(muscle: string): MuscleRegion {
  return REGION[muscle] ?? "other";
}

export const REGION_DOT: Record<MuscleRegion, string> = {
  push: "bg-push",
  pull: "bg-pull",
  legs: "bg-legs",
  core: "bg-core",
  other: "bg-muted-foreground/50",
};

/** Hero background per session tone. Text on top always uses `text-ink`. */
export const TONE_BG: Record<SessionTone, string> = {
  push: "bg-push",
  pull: "bg-pull",
  legs: "bg-legs",
  sun: "bg-sun",
};

/** Picks the dominant movement pattern; mixed or full-body sessions get sun yellow. */
export function sessionTone(muscles: string[]): SessionTone {
  const counts = { push: 0, pull: 0, legs: 0 };
  for (const m of muscles) {
    const region = muscleRegion(m);
    if (region === "push" || region === "pull" || region === "legs") counts[region]++;
  }
  const total = counts.push + counts.pull + counts.legs;
  if (!total) return "sun";
  const [top, value] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0] as [keyof typeof counts, number];
  return value / total >= 0.6 ? top : "sun";
}

export function muscleLabel(muscle: string) {
  const label = muscle.replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}
