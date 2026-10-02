import { eq } from "drizzle-orm";
import db from "@/lib/db";
import { verifySession } from "@/lib/auth/dal";
import { userProfiles } from "@/lib/db/schema";
import { OnboardingFlow, type OnboardingAnswers } from "./onboarding-flow";

export default async function OnboardingPage() {
  const session = await verifySession();
  const profile = await db.query.userProfiles.findFirst({ where: eq(userProfiles.userId, session.userId) });

  // Returning users update their answers; everything is pre-filled in metric units.
  const saved: OnboardingAnswers | undefined = profile && {
    goal: profile.goal,
    experience: profile.experience,
    age: String(profile.age),
    sex: profile.sex,
    height: String(profile.height),
    weight: String(profile.weight),
    activityLevel: profile.activityLevel,
    trainingDays: String(profile.trainingDays),
    sessionDuration: String(profile.sessionDuration),
    equipment: profile.equipment,
    dietaryPreferences: profile.dietaryPreferences,
    restrictions: profile.restrictions ?? "",
    avoidMovements: profile.avoidMovements ?? "",
  };

  return <OnboardingFlow saved={saved} />;
}
