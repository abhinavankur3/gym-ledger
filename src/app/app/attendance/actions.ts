"use server";

import { eq, and, gte, lt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { gymAttendance } from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/dal";
import { getUserTimeZone, localDateKey, localDateKeyDaysAgo, startOfLocalDayIso } from "@/lib/dates";
import { BACKDATE_DAYS, isAllowedLogDate } from "@/lib/nutrition/meal-log";

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

/** UTC ISO bounds of a local calendar day. */
function localDayBounds(date: string, timeZone: string) {
  const start = startOfLocalDayIso(new Date(`${date}T12:00:00Z`), timeZone);
  const end = startOfLocalDayIso(new Date(Date.parse(start) + 36 * 60 * 60 * 1000), timeZone);
  return { start, end };
}

/** Mark or unmark a gym visit on a past day (backdating from the attendance calendar). */
export async function setDayAttendance(date: string, attended: boolean) {
  const session = await verifySession();
  const tz = await getUserTimeZone();
  const today = localDateKey(new Date(), tz);
  if (!isAllowedLogDate(date, today, localDateKeyDaysAgo(new Date(), BACKDATE_DAYS, tz))) {
    return { error: `You can change gym days for the last ${BACKDATE_DAYS} days, not the future.` };
  }
  const { start, end } = localDayBounds(date, tz);
  const inDay = and(eq(gymAttendance.userId, session.userId), gte(gymAttendance.checkIn, start), lt(gymAttendance.checkIn, end));

  if (attended) {
    const existing = await db.query.gymAttendance.findFirst({ where: inDay, columns: { id: true } });
    if (!existing) {
      // A past visit is recorded as an hour in the early evening; today uses the real time
      const checkIn = date === today ? new Date() : new Date(Date.parse(start) + 18 * 60 * 60 * 1000);
      await db.insert(gymAttendance).values({
        userId: session.userId,
        checkIn: checkIn.toISOString(),
        checkOut: date === today ? null : new Date(checkIn.getTime() + 60 * 60 * 1000).toISOString(),
        notes: date === today ? null : "Added later",
      });
    }
  } else {
    await db.delete(gymAttendance).where(inDay);
  }

  revalidatePath("/app/attendance");
  revalidatePath("/app");
  return { success: true };
}

/** Whether there's a gym visit on a local day. */
export async function getDayAttendance(date: string) {
  const session = await verifySession();
  const { start, end } = localDayBounds(date, await getUserTimeZone());
  const row = await db.query.gymAttendance.findFirst({
    where: and(eq(gymAttendance.userId, session.userId), gte(gymAttendance.checkIn, start), lt(gymAttendance.checkIn, end)),
    columns: { id: true },
  });
  return { attended: !!row };
}
