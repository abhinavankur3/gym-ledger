import "server-only";

import { and, count, eq, gte } from "drizzle-orm";
import db from "@/lib/db";
import { aiUsage } from "@/lib/db/schema";

export type AiKind = "workout_plan" | "meal_plan" | "food_estimate";

/** Calls allowed per user in a rolling 24 hours. */
export const DAILY_AI_LIMITS: Record<AiKind, number> = {
  workout_plan: 15,
  meal_plan: 15,
  food_estimate: 60,
};

const LIMIT_MESSAGE: Record<AiKind, string> = {
  workout_plan: "You've hit today's limit for new workout plans. Try again tomorrow.",
  meal_plan: "You've hit today's limit for new meal plans. Try again tomorrow.",
  food_estimate: "You've hit today's limit for meal estimates. Log the rest from your plan, or try again tomorrow.",
};

const BUSY_MESSAGE: Record<AiKind, string> = {
  workout_plan: "Kochi is already building a workout plan for you. Give it a moment.",
  meal_plan: "Kochi is already building a meal plan for you. Give it a moment.",
  food_estimate: "Kochi is still estimating your last meal. Give it a moment.",
};

/** One call in flight per user and kind (single Node process, so in-memory is enough). */
const inFlight = new Set<string>();

/**
 * Runs `fn` if the user is under their daily quota and has no other call of this
 * kind running; records the use before calling. Returns `{ error }` otherwise.
 */
export async function withAiQuota<T>(userId: number, kind: AiKind, fn: () => Promise<T>): Promise<T | { error: string }> {
  const key = `${userId}:${kind}`;
  if (inFlight.has(key)) return { error: BUSY_MESSAGE[kind] };
  inFlight.add(key);
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const [{ used }] = await db
      .select({ used: count() })
      .from(aiUsage)
      .where(and(eq(aiUsage.userId, userId), eq(aiUsage.kind, kind), gte(aiUsage.createdAt, since)));
    if (used >= DAILY_AI_LIMITS[kind]) return { error: LIMIT_MESSAGE[kind] };
    await db.insert(aiUsage).values({ userId, kind, createdAt: new Date().toISOString() });
    return await fn();
  } finally {
    inFlight.delete(key);
  }
}

export function isQuotaError(value: unknown): value is { error: string } {
  return typeof value === "object" && value !== null && "error" in value && typeof (value as { error: unknown }).error === "string";
}
