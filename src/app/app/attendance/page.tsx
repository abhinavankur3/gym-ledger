import { eq, and, gte, sql, desc } from "drizzle-orm";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { gymAttendance } from "@/lib/db/schema";
import { PageHeader } from "@/components/layout/page-header";
import { AttendanceCalendar } from "./attendance-calendar";
import { CheckInButton } from "./check-in-button";
import { Flame } from "lucide-react";
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

  const visitsThisMonth = attendedDays.size;

  return (
    <main className="pb-6">
      <PageHeader title="Attendance" subtitle={`${visitsThisMonth} ${visitsThisMonth === 1 ? "visit" : "visits"} this month`} back={{ href: "/app/progress", label: "Progress" }} />

      {/* Streak: the one bold element */}
      <section aria-label="Streak" className="relative overflow-hidden rounded-[2rem] bg-legs p-6 text-ink">
        <span aria-hidden className="pointer-events-none absolute -right-2 -top-6 select-none font-display text-[9rem] leading-none text-white/25">
          {streak}
        </span>
        <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/35">
          <Flame className="h-5 w-5" />
        </span>
        <p className="relative mt-5 flex items-baseline gap-2">
          <span className="font-display tabular text-6xl">{streak}</span>
          <span className="text-lg font-semibold">day streak</span>
        </p>
        <p className="relative mt-2 text-sm font-medium text-ink/75">
          {streak > 0 ? "Check in again tomorrow to keep it going." : "Check in today to start a streak."}
        </p>
      </section>

      <div className="mt-3">
        <AttendanceCalendar
          year={year}
          month={month}
          attendedDays={Array.from(attendedDays)}
          activeCheckIn={!!activeCheckIn}
          today={today}
        />
      </div>

      <div className="mt-6">
        <CheckInButton isCheckedIn={!!activeCheckIn} checkInTime={activeCheckIn?.checkIn} />
      </div>
    </main>
  );
}
