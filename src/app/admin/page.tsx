import { count } from "drizzle-orm";
import db from "@/lib/db";
import { users, workouts, gymAttendance } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Dumbbell, CalendarCheck } from "lucide-react";

export default async function AdminDashboard() {
  const [userCount] = await db.select({ value: count() }).from(users);
  const [workoutCount] = await db.select({ value: count() }).from(workouts);
  const [attendanceCount] = await db.select({ value: count() }).from(gymAttendance);

  const stats = [
    { label: "Total Users", value: userCount.value, icon: Users, color: "text-primary" },
    { label: "Total Workouts", value: workoutCount.value, icon: Dumbbell, color: "text-primary" },
    { label: "Total Check-ins", value: attendanceCount.value, icon: CalendarCheck, color: "text-emerald-400" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight mb-6">Admin Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="surface rounded-2xl border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
