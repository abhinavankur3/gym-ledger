import { requireUser } from "@/lib/auth/dal";
import { getWorkoutHistory } from "./actions";
import { BlurFade } from "@/components/ui/blur-fade";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Plus, Dumbbell, Clock, FileText, CalendarDays } from "lucide-react";

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  chest: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  back: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  shoulders: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  biceps: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  triceps: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  quads: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  hamstrings: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  glutes: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  calves: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  core: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  forearms: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  full_body: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

function formatDuration(startedAt: string, completedAt: string | null) {
  if (!completedAt) return "In progress";
  const diff = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

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
            <Link href={`/app/workouts/${workout.id}`}>
              <Card className="surface border-white/10 rounded-2xl hover:bg-white/5 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{workout.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(workout.startedAt).toLocaleDateString(
                          undefined,
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDuration(workout.startedAt, workout.completedAt)}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-1.5 flex-wrap">
                      {workout.muscleGroups.map((mg) => (
                        <Badge
                          key={mg}
                          variant="outline"
                          className={cn(
                            "text-[9px]",
                            MUSCLE_GROUP_COLORS[mg]
                          )}
                        >
                          {mg.replace("_", " ")}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Dumbbell className="h-3 w-3" />
                        {workout.exerciseCount}
                      </span>
                      <span>
                        {workout.totalVolume > 0
                          ? `${(workout.totalVolume / 1000).toFixed(1)}t`
                          : `${workout.setCount} sets`}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
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
