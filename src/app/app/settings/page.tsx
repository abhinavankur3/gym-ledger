import { eq } from "drizzle-orm";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { userPreferences } from "@/lib/db/schema";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const prefs = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, user.id),
  });

  return (
    <SettingsForm
      initialName={user.name}
      initialWeightUnit={prefs?.weightUnit ?? "kg"}
      initialMeasurementUnit={prefs?.measurementUnit ?? "cm"}
      initialTheme={prefs?.theme ?? "dark"}
    />
  );
}
