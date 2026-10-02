import { count } from "drizzle-orm";
import db from "@/lib/db";
import { users, workouts, gymAttendance } from "@/lib/db/schema";
import { Users, Dumbbell, CalendarCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function AdminDashboard() {
  const [userCount] = await db.select({ value: count() }).from(users);
  const [workoutCount] = await db.select({ value: count() }).from(workouts);
  const [attendanceCount] = await db.select({ value: count() }).from(gymAttendance);

  const stats = [
    { label: "Users", value: userCount.value, icon: Users, tone: "bg-pull/15 text-pull" },
    { label: "Workouts logged", value: workoutCount.value, icon: Dumbbell, tone: "bg-push/15 text-push" },
    { label: "Gym check-ins", value: attendanceCount.value, icon: CalendarCheck, tone: "bg-legs/15 text-legs" },
  ];

  return (
    <div>
      <h1 className="font-display text-[2rem] md:text-[2.5rem]">Dashboard</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Activity across everyone on this server.</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-3xl bg-card p-5 shadow-soft dark:ring-1 dark:ring-white/5">
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", stat.tone)}>
              <stat.icon className="h-5 w-5" />
            </span>
            <p className="mt-4 text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-1 font-display tabular text-4xl">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
