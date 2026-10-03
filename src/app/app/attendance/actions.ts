"use server";

import { eq, and, gte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { gymAttendance } from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/dal";
import { getUserTimeZone, startOfLocalDayIso } from "@/lib/dates";

export async function checkIn() {
  const session = await verifySession();
  const now = new Date().toISOString();
  const today = startOfLocalDayIso(new Date(), await getUserTimeZone());

  // Check if already checked in today
  const existing = await db.query.gymAttendance.findFirst({
    where: and(
      eq(gymAttendance.userId, session.userId),
      gte(gymAttendance.checkIn, today),
      sql`${gymAttendance.checkOut} IS NULL`
    ),
  });

  if (existing) {
    return { error: "Already checked in." };
  }

  await db.insert(gymAttendance).values({
    userId: session.userId,
    checkIn: now,
  });

  revalidatePath("/app/attendance");
  revalidatePath("/app");
  return { success: true };
}

export async function checkOut() {
  const session = await verifySession();
  const today = startOfLocalDayIso(new Date(), await getUserTimeZone());

  const active = await db.query.gymAttendance.findFirst({
    where: and(
      eq(gymAttendance.userId, session.userId),
      gte(gymAttendance.checkIn, today),
      sql`${gymAttendance.checkOut} IS NULL`
    ),
  });

  if (!active) {
    return { error: "Not checked in." };
  }

  await db
    .update(gymAttendance)
    .set({ checkOut: new Date().toISOString() })
    .where(eq(gymAttendance.id, active.id));

  revalidatePath("/app/attendance");
  revalidatePath("/app");
  return { success: true };
}
