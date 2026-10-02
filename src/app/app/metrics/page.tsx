import { eq, desc } from "drizzle-orm";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { bodyMetrics, userPreferences } from "@/lib/db/schema";
import { PageHeader } from "@/components/layout/page-header";
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
    <main className="pb-6">
      <PageHeader title="Body metrics" subtitle="Log a reading, then watch the trend" back={{ href: "/app/progress", label: "Progress" }} />
      <MetricsClient
        initialMetrics={metrics}
        defaultWeightUnit={defaultWeightUnit}
        defaultMeasurementUnit={defaultMeasurementUnit}
      />
    </main>
  );
}
