"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { planDrafts, userProfiles, weeklyReviews } from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/dal";
import { getUserTimeZone } from "@/lib/dates";
import { generatePlan } from "@/lib/ai/plan-generator";
import { isQuotaError, withAiQuota } from "@/lib/ai/quota";
import { weekKey } from "@/lib/adaptive/weekly";
import { MAX_KCAL_ADJUSTMENT, type Proposal } from "@/lib/adaptive/review";

/**
 * Accept or decline one proposal from a weekly review. Accepting applies the
 * change; either way the decision is stored on the review, which is the change log.
 */
export async function decideProposal(reviewId: number, proposalId: string, accept: boolean) {
  const session = await verifySession();
  const review = await db.query.weeklyReviews.findFirst({ where: and(eq(weeklyReviews.id, reviewId), eq(weeklyReviews.userId, session.userId)) });
  if (!review) return { error: "That check-in wasn't found." };

  let proposals: Proposal[];
  try {
    proposals = JSON.parse(review.proposalsJson) as Proposal[];
  } catch {
    return { error: "That check-in couldn't be read." };
  }
  const proposal = proposals.find((p) => p.id === proposalId);
  if (!proposal) return { error: "That suggestion wasn't found." };
  if (proposal.status !== "pending") return { error: "You've already decided on this one." };

  const profile = await db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, session.userId) });
  if (!profile) return { error: "Finish your profile first." };

  let next: "/app/plan" | null = null;
  if (accept) {
    const now = new Date().toISOString();
    if (proposal.type === "calories" && proposal.change.kcalDelta) {
      const total = Math.max(-MAX_KCAL_ADJUSTMENT, Math.min(MAX_KCAL_ADJUSTMENT, profile.kcalAdjustment + proposal.change.kcalDelta));
      await db.update(userProfiles).set({ kcalAdjustment: total, updatedAt: now }).where(eq(userProfiles.userId, session.userId));
    } else if (proposal.type === "deload") {
      await db.update(userProfiles).set({ deloadWeek: weekKey(new Date(), await getUserTimeZone()), updatedAt: now }).where(eq(userProfiles.userId, session.userId));
    } else if (proposal.type === "training_days" || proposal.type === "session_length") {
      const updated = {
        ...profile,
        trainingDays: proposal.change.trainingDays ?? profile.trainingDays,
        sessionDuration: proposal.change.sessionDuration ?? profile.sessionDuration,
      };
      // Draft the new plan first; the profile only changes if that worked
      const generated = await withAiQuota(session.userId, "workout_plan", () => generatePlan(updated, session.userId, ""));
      if (isQuotaError(generated)) return { error: generated.error };
      await db.transaction(async (tx) => {
        await tx.update(userProfiles).set({ trainingDays: updated.trainingDays, sessionDuration: updated.sessionDuration, updatedAt: now }).where(eq(userProfiles.userId, session.userId));
        await tx
          .insert(planDrafts)
          .values({ userId: session.userId, planJson: JSON.stringify(generated.plan), feedback: null, updatedAt: now })
          .onConflictDoUpdate({ target: planDrafts.userId, set: { planJson: JSON.stringify(generated.plan), feedback: null, updatedAt: now } });
      });
      next = "/app/plan";
    }
  }

  const decided = proposals.map((p) => (p.id === proposalId ? { ...p, status: accept ? "accepted" : "declined", decidedAt: new Date().toISOString() } : p));
  await db.update(weeklyReviews).set({ proposalsJson: JSON.stringify(decided), updatedAt: new Date().toISOString() }).where(eq(weeklyReviews.id, reviewId));

  revalidatePath("/app/review");
  revalidatePath("/app");
  revalidatePath("/app/nutrition");
  return { success: true, next };
}
