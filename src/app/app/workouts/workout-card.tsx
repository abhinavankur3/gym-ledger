"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteWorkout } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Dumbbell, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";

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

function formatWorkoutDate(value: string) {
  const date = new Date(value);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${weekdays[date.getUTCDay()]}, ${months[date.getUTCMonth()]} ${date.getUTCDate()}`;
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
  const [confirmOpen, setConfirmOpen] = useState(false);

  function requestDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setConfirmOpen(true);
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteWorkout(workout.id);
      toast.success("Workout deleted");
      router.refresh();
    });
  }

  return (
    <>
    <Link href={`/app/workouts/${workout.id}`}>
      <Card className="surface rounded-3xl border-border transition-colors hover:border-primary/40">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold">{workout.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatWorkoutDate(workout.startedAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDuration(workout.startedAt, workout.completedAt)}
              </span>
              <button
                type="button"
                onClick={requestDelete}
                disabled={pending}
                aria-label={`Delete ${workout.name}`}
                className="-mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
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
    {/* Rendered outside the Link so dialog clicks don't bubble into navigation */}
    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title={`Delete "${workout.name}"?`}
      description="This removes the workout and all of its logged sets."
      confirmLabel="Delete"
      destructive
      onConfirm={handleDelete}
    />
    </>
  );
}
