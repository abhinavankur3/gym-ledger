import { requireUser } from "@/lib/auth/dal";
import { getWorkoutHistory } from "./actions";
import { BlurFade } from "@/components/ui/blur-fade";
import { Card, CardContent } from "@/components/ui/card";
import { WorkoutCard } from "./workout-card";
import Link from "next/link";
import { Plus, Dumbbell, FileText, CalendarDays } from "lucide-react";

export default async function WorkoutsPage() {
  await requireUser();
  const workouts = await getWorkoutHistory();

  return (
    <div className="px-4 pt-8">
      <BlurFade delay={0}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Workouts</h1>
          <Link
            href="/app/workouts/new"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </div>
      </BlurFade>

      <BlurFade delay={0.05}>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link href="/app/workouts/templates">
            <Card className="surface border-white/10 rounded-2xl hover:bg-white/5 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium text-sm">Templates</span>
              </CardContent>
            </Card>
          </Link>
          <Link href="/app/routines">
            <Card className="surface border-white/10 rounded-2xl hover:bg-white/5 transition-colors">
              <CardContent className="p-4 flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-primary" />
                <span className="font-medium text-sm">Routines</span>
              </CardContent>
            </Card>
          </Link>
        </div>
      </BlurFade>

      <div className="mt-4 space-y-3">
        {workouts.map((workout, i) => (
          <BlurFade key={workout.id} delay={0.05 * (i + 1)}>
            <WorkoutCard workout={workout} />
          </BlurFade>
        ))}

        {workouts.length === 0 && (
          <BlurFade delay={0.1}>
            <div className="text-center py-16">
              <Dumbbell className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No workouts yet</p>
              <Link
                href="/app/workouts/new"
                className="mt-4 inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium"
              >
                <Plus className="h-4 w-4" /> Start Your First Workout
              </Link>
            </div>
          </BlurFade>
        )}
      </div>
    </div>
  );
}
