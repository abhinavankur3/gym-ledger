import Link from "next/link";
import { eq, and, gte, sql, desc } from "drizzle-orm";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { gymAttendance } from "@/lib/db/schema";
import { BlurFade } from "@/components/ui/blur-fade";
import { AttendanceCalendar } from "./attendance-calendar";
import { CheckInButton } from "./check-in-button";
import { ArrowLeft, Flame } from "lucide-react";
import { getUserTimeZone, localDateKey, startOfLocalDayIso } from "@/lib/dates";

export default async function AttendancePage() {
  const user = await getCurrentUser();
  const tz = await getUserTimeZone();
  const now = new Date();
  const today = localDateKey(now, tz);
  const [year, month] = today.split("-").map(Number);

  // Active check-in (since local midnight)
  const activeCheckIn = await db.query.gymAttendance.findFirst({
    where: and(
      eq(gymAttendance.userId, user.id),
      gte(gymAttendance.checkIn, startOfLocalDayIso(now, tz)),
      sql`${gymAttendance.checkOut} IS NULL`
    ),
  });

  const allRecords = await db.query.gymAttendance.findMany({
    where: eq(gymAttendance.userId, user.id),
    orderBy: [desc(gymAttendance.checkIn)],
    limit: 365,
  });
  const attendedDates = new Set(allRecords.map((r) => localDateKey(r.checkIn, tz)));

  // Streak: consecutive local days ending today (or yesterday if not yet checked in today)
  let streak = 0;
  const cursor = new Date(`${today}T00:00:00Z`);
  if (!attendedDates.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (attendedDates.has(cursor.toISOString().split("T")[0])) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  const monthPrefix = today.slice(0, 8);
  const attendedDays = new Set([...attendedDates].filter((d) => d.startsWith(monthPrefix)));

  return (
    <div className="px-4 pt-8">
      <BlurFade delay={0}>
        <Link href="/app/more" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> More</Link>
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
            today={today}
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
