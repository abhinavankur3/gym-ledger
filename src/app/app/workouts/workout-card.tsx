"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteWorkout } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Dumbbell, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";

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

type Workout = {
  id: number;
  name: string;
  startedAt: string;
  completedAt: string | null;
  setCount: number;
  exerciseCount: number;
  totalVolume: number;
  muscleGroups: string[];
};

export function WorkoutCard({ workout }: { workout: Workout }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${workout.name}"?`)) return;
    startTransition(async () => {
      await deleteWorkout(workout.id);
      toast.success("Workout deleted");
      router.refresh();
    });
  }

  return (
    <Link href={`/app/workouts/${workout.id}`}>
      <Card className="surface border-white/10 rounded-2xl hover:bg-white/5 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold">{workout.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(workout.startedAt).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDuration(workout.startedAt, workout.completedAt)}
              </span>
              <button
                onClick={handleDelete}
                disabled={pending}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-1.5 flex-wrap">
              {workout.muscleGroups.map((mg) => (
                <Badge
                  key={mg}
                  variant="outline"
                  className={cn("text-[9px]", MUSCLE_GROUP_COLORS[mg])}
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
  );
}
