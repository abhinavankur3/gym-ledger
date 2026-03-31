"use server";

import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { bodyMetrics } from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/dal";

export async function addMetric(formData: FormData) {
  const session = await verifySession();

  const metricType = formData.get("metricType") as string;
  const value = Number(formData.get("value"));
  const unit = formData.get("unit") as string;
  const date = (formData.get("date") as string) || new Date().toISOString().split("T")[0];
  const notes = formData.get("notes") as string;

  if (!metricType || isNaN(value) || !unit) {
    return { error: "All fields are required." };
  }

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

export async function getMetrics(metricType?: string) {
  const session = await verifySession();

  const conditions = [eq(bodyMetrics.userId, session.userId)];
  if (metricType) {
    conditions.push(eq(bodyMetrics.metricType, metricType));
  }

  return db.query.bodyMetrics.findMany({
    where: and(...conditions),
    orderBy: [desc(bodyMetrics.date)],
    limit: 100,
  });
}
