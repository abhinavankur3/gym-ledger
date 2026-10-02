import { requireUser } from "@/lib/auth/dal";
import { getWorkoutHistory } from "./actions";
import { BlurFade } from "@/components/ui/blur-fade";
import { WorkoutCard } from "./workout-card";
import Link from "next/link";
import { Plus, Dumbbell } from "lucide-react";

export default async function WorkoutsPage() {
  await requireUser();
  const workouts = await getWorkoutHistory();

  return (
    <main className="px-4 pt-8">
      <BlurFade delay={0}>
        <div className="flex items-center justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Training log</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Workouts</h1></div>
          <Link
            href="/app/workouts/new"
            aria-label="Start a new workout"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </div>
      </BlurFade>

      <div className="mt-8 space-y-3">
        {workouts.map((workout, i) => (
          <BlurFade key={workout.id} delay={0.05 * (i + 1)}>
            <WorkoutCard workout={workout} />
          </BlurFade>
        ))}

        {workouts.length === 0 && (
          <BlurFade delay={0.1}>
            <div className="rounded-3xl border border-dashed border-border px-6 py-16 text-center">
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
    </main>
  );
}
