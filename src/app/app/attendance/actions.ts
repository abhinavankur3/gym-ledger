"use server";

import { eq, and, gte, sql, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { gymAttendance } from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/dal";

export async function checkIn() {
  const session = await verifySession();
  const now = new Date().toISOString();
  const today = now.split("T")[0];

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
  const today = new Date().toISOString().split("T")[0];

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

export async function getAttendanceForMonth(year: number, month: number) {
  const session = await verifySession();
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const end = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  const records = await db.query.gymAttendance.findMany({
    where: and(
      eq(gymAttendance.userId, session.userId),
      gte(gymAttendance.checkIn, start),
      sql`${gymAttendance.checkIn} < ${end}`
    ),
    orderBy: [desc(gymAttendance.checkIn)],
  });

  return records;
}
