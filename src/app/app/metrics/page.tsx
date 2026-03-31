import { eq, desc } from "drizzle-orm";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { bodyMetrics, userPreferences } from "@/lib/db/schema";
import { BlurFade } from "@/components/ui/blur-fade";
import { MetricsClient } from "./metrics-client";

export default async function MetricsPage() {
  const user = await getCurrentUser();

  const metrics = await db.query.bodyMetrics.findMany({
    where: eq(bodyMetrics.userId, user.id),
    orderBy: [desc(bodyMetrics.date)],
    limit: 200,
  });

  const prefs = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, user.id),
  });

  const defaultWeightUnit = prefs?.weightUnit || "kg";
  const defaultMeasurementUnit = prefs?.measurementUnit || "cm";

  return (
    <div className="px-4 pt-8">
      <BlurFade delay={0}>
        <h1 className="text-2xl font-bold tracking-tight">Body Metrics</h1>
      </BlurFade>

      <BlurFade delay={0.1}>
        <MetricsClient
          initialMetrics={metrics}
          defaultWeightUnit={defaultWeightUnit}
          defaultMeasurementUnit={defaultMeasurementUnit}
        />
      </BlurFade>
    </div>
  );
}
