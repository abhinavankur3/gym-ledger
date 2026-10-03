import { eq, or } from "drizzle-orm";
import { exercises } from "@/lib/db/schema";

/**
 * Exercises a user may see and use: the built-in library plus custom ones they
 * created (by hand or via their AI plan). Other users' custom exercises stay
 * private, so text one user gets the AI to invent never reaches anyone else.
 */
export function visibleExercises(userId: number) {
  return or(eq(exercises.isCustom, false), eq(exercises.createdByUserId, userId));
}
