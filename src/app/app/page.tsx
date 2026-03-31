import { eq, and, gte, count, desc, sql } from "drizzle-orm";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { gymAttendance, workouts, bodyMetrics } from "@/lib/db/schema";
import { getTodayTemplate } from "./routines/actions";
import { BlurFade } from "@/components/ui/blur-fade";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Flame, Dumbbell, Scale, CalendarCheck } from "lucide-react";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function AppDashboard() {
  const user = await getCurrentUser();
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Check if currently checked in
  const activeCheckIn = await db.query.gymAttendance.findFirst({
    where: and(
      eq(gymAttendance.userId, user.id),
      gte(gymAttendance.checkIn, today),
      sql`${gymAttendance.checkOut} IS NULL`
    ),
  });

  // Workouts this week
  const [weekWorkouts] = await db
    .select({ value: count() })
    .from(workouts)
    .where(
      and(eq(workouts.userId, user.id), gte(workouts.startedAt, weekAgo))
    );

  // Latest body weight
  const latestWeight = await db.query.bodyMetrics.findFirst({
    where: and(
      eq(bodyMetrics.userId, user.id),
      eq(bodyMetrics.metricType, "weight")
    ),
    orderBy: [desc(bodyMetrics.date)],
  });

  // Calculate streak
  let streak = 0;
  const attendanceRecords = await db.query.gymAttendance.findMany({
    where: eq(gymAttendance.userId, user.id),
    orderBy: [desc(gymAttendance.checkIn)],
    limit: 90,
  });

  if (attendanceRecords.length > 0) {
    const attendedDates = new Set(
      attendanceRecords.map((r) => r.checkIn.split("T")[0])
    );
    const checkDate = new Date(today);
    // If not attended today, start from yesterday
    if (!attendedDates.has(today)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (attendedDates.has(checkDate.toISOString().split("T")[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }
  }

  // Fetch today's template from active routine
  const todayTemplate = await getTodayTemplate();

  return (
    <div className="px-4 pt-8">
      <BlurFade delay={0}>
        <p className="text-sm text-muted-foreground">{getGreeting()},</p>
        <h1 className="text-2xl font-bold tracking-tight">{user.name}</h1>
      </BlurFade>

      {/* Attendance Status */}
      <BlurFade delay={0.1}>
        <Card className="mt-6 surface border-white/10 rounded-2xl overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  {activeCheckIn
                    ? "Currently at the gym"
                    : "You haven't checked in today"}
                </p>
                {activeCheckIn && (
                  <p className="text-xs text-primary mt-1">
                    Since{" "}
                    {new Date(activeCheckIn.checkIn).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
              <div
                className={`h-3 w-3 rounded-full ${
                  activeCheckIn ? "bg-emerald-400 animate-pulse" : "bg-muted"
                }`}
              />
            </div>
          </CardContent>
        </Card>
      </BlurFade>

      {/* Today's Workout Card */}
      {todayTemplate && (
        <BlurFade delay={0.15}>
          <Card className="mt-4 surface border-white/10 rounded-2xl overflow-hidden">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">
                Today&apos;s workout
              </p>
              <p className="font-semibold mt-1">{todayTemplate.name}</p>
              <div className="flex gap-1 mt-2 flex-wrap">
                {todayTemplate.exercises.slice(0, 3).map((ex) => (
                  <Badge
                    key={ex.exerciseId}
                    variant="outline"
                    className="text-[9px] border-white/10"
                  >
                    {ex.name}
                  </Badge>
                ))}
                {todayTemplate.exercises.length > 3 && (
                  <Badge
                    variant="outline"
                    className="text-[9px] border-white/10"
                  >
                    +{todayTemplate.exercises.length - 3} more
                  </Badge>
                )}
              </div>
              <Link
                href={`/app/workouts/new?templateId=${todayTemplate.id}`}
              >
                <Button className="mt-3 w-full rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90">
                  Start {todayTemplate.name}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </BlurFade>
      )}

      {/* Stats Row */}
      <BlurFade delay={0.2}>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Card className="surface border-white/10 rounded-2xl">
            <CardContent className="p-4 text-center">
              <Flame className="mx-auto h-5 w-5 text-orange-400 mb-1" />
              <p className="text-2xl font-bold">
                {streak > 0 ? <NumberTicker value={streak} /> : "0"}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Day Streak
              </p>
            </CardContent>
          </Card>

          <Card className="surface border-white/10 rounded-2xl">
            <CardContent className="p-4 text-center">
              <Dumbbell className="mx-auto h-5 w-5 text-primary mb-1" />
              <p className="text-2xl font-bold">
                <NumberTicker value={weekWorkouts.value} />
              </p>
              <p className="text-[10px] text-muted-foreground">
                This Week
              </p>
            </CardContent>
          </Card>

          <Card className="surface border-white/10 rounded-2xl">
            <CardContent className="p-4 text-center">
              <Scale className="mx-auto h-5 w-5 text-muted-foreground mb-1" />
              <p className="text-2xl font-bold">
                {latestWeight ? (
                  <NumberTicker value={latestWeight.value} decimalPlaces={1} />
                ) : (
                  "—"
                )}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {latestWeight ? latestWeight.unit : "Weight"}
              </p>
            </CardContent>
          </Card>
        </div>
      </BlurFade>

      {/* Quick Actions */}
      <BlurFade delay={0.3}>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link href="/app/attendance">
            <Button
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
            >
              <CalendarCheck className="h-4 w-4 mr-2" />
              {activeCheckIn ? "Check Out" : "Check In"}
            </Button>
          </Link>
          <Link
            href={
              todayTemplate
                ? `/app/workouts/new?templateId=${todayTemplate.id}`
                : "/app/workouts/new"
            }
          >
            <Button
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
            >
              <Dumbbell className="h-4 w-4 mr-2" />
              {todayTemplate ? todayTemplate.name : "Start Workout"}
            </Button>
          </Link>
        </div>
      </BlurFade>
    </div>
  );
}
