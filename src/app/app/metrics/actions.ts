"use server";

import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { bodyMetrics } from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/dal";

/** Allowed units and sane value bounds per metric type. */
const METRIC_RULES: Record<string, Record<string, [number, number]>> = {
  weight: { kg: [20, 400], lbs: [44, 880] },
  body_fat: { "%": [2, 75] },
  chest: { cm: [30, 250], in: [12, 100] },
  waist: { cm: [30, 250], in: [12, 100] },
  hips: { cm: [30, 250], in: [12, 100] },
  bicep: { cm: [10, 100], in: [4, 40] },
  thigh: { cm: [20, 150], in: [8, 60] },
};

const metricSchema = z.object({
  metricType: z.enum(Object.keys(METRIC_RULES) as [string, ...string[]]),
  value: z.number().finite(),
  unit: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().trim().max(300).optional(),
});

export async function addMetric(formData: FormData) {
  const session = await verifySession();

  const parsed = metricSchema.safeParse({
    metricType: formData.get("metricType"),
    value: Number(formData.get("value")),
    unit: formData.get("unit"),
    date: (formData.get("date") as string) || new Date().toISOString().split("T")[0],
    notes: (formData.get("notes") as string) || undefined,
  });
  if (!parsed.success) return { error: "All fields are required." };
  const { metricType, value, unit, date, notes } = parsed.data;

  const bounds = METRIC_RULES[metricType][unit];
  if (!bounds) return { error: "Choose a valid unit for this metric." };
  if (value < bounds[0] || value > bounds[1]) return { error: `Enter a value between ${bounds[0]} and ${bounds[1]} ${unit}.` };
  // Allow a day ahead for time zones; reject anything further in the future
  const latest = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  if (Number.isNaN(Date.parse(date)) || date > latest) return { error: "Choose a date that isn't in the future." };

  await db.insert(bodyMetrics).values({
    userId: session.userId,
    date,
    metricType,
    value,
    unit,
    notes: notes || null,
  });

  revalidatePath("/app/metrics");
  revalidatePath("/app");
  return { success: true };
}

export async function deleteMetric(metricId: number) {
  const session = await verifySession();

  const metric = await db.query.bodyMetrics.findFirst({
    where: and(
      eq(bodyMetrics.id, metricId),
      eq(bodyMetrics.userId, session.userId)
    ),
  });

  if (!metric) return { error: "Metric not found." };

  await db.delete(bodyMetrics).where(eq(bodyMetrics.id, metricId));
  revalidatePath("/app/metrics");
  return { success: true };
}
