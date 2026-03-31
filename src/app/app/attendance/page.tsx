import { eq, and, gte, sql, desc } from "drizzle-orm";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { gymAttendance } from "@/lib/db/schema";
import { BlurFade } from "@/components/ui/blur-fade";
import { AttendanceCalendar } from "./attendance-calendar";
import { CheckInButton } from "./check-in-button";
import { Flame } from "lucide-react";

export default async function AttendancePage() {
  const user = await getCurrentUser();
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Active check-in
  const activeCheckIn = await db.query.gymAttendance.findFirst({
    where: and(
      eq(gymAttendance.userId, user.id),
      gte(gymAttendance.checkIn, today),
      sql`${gymAttendance.checkOut} IS NULL`
    ),
  });

  // This month's attendance
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const end = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;

  const monthRecords = await db.query.gymAttendance.findMany({
    where: and(
      eq(gymAttendance.userId, user.id),
      gte(gymAttendance.checkIn, start),
      sql`${gymAttendance.checkIn} < ${end}`
    ),
    orderBy: [desc(gymAttendance.checkIn)],
  });

  // Calculate streak
  const allRecords = await db.query.gymAttendance.findMany({
    where: eq(gymAttendance.userId, user.id),
    orderBy: [desc(gymAttendance.checkIn)],
    limit: 365,
  });

  let streak = 0;
  if (allRecords.length > 0) {
    const attendedDates = new Set(
      allRecords.map((r) => r.checkIn.split("T")[0])
    );
    const checkDate = new Date(today);
    if (!attendedDates.has(today)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (attendedDates.has(checkDate.toISOString().split("T")[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  const attendedDays = new Set(
    monthRecords.map((r) => r.checkIn.split("T")[0])
  );

  return (
    <div className="px-4 pt-8">
      <BlurFade delay={0}>
        <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
      </BlurFade>

      {/* Streak */}
      <BlurFade delay={0.1}>
        <div className="mt-4 flex items-center gap-3 surface rounded-2xl p-4 border border-white/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/20">
            <Flame className="h-6 w-6 text-orange-400" />
          </div>
          <div>
            <p className="text-2xl font-bold">{streak} day streak</p>
            <p className="text-xs text-muted-foreground">
              {streak > 0 ? "Keep it going!" : "Start your streak today!"}
            </p>
          </div>
        </div>
      </BlurFade>

      {/* Calendar */}
      <BlurFade delay={0.2}>
        <div className="mt-4">
          <AttendanceCalendar
            year={year}
            month={month}
            attendedDays={Array.from(attendedDays)}
            activeCheckIn={!!activeCheckIn}
          />
        </div>
      </BlurFade>

      {/* Check In/Out Button */}
      <BlurFade delay={0.3}>
        <div className="mt-6">
          <CheckInButton
            isCheckedIn={!!activeCheckIn}
            checkInTime={activeCheckIn?.checkIn}
          />
        </div>
      </BlurFade>
    </div>
  );
}
