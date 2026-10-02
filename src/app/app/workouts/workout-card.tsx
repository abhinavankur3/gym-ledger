"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteWorkout } from "./actions";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { MuscleChip } from "@/components/muscle-chip";
import { TONE_BG, sessionTone } from "@/lib/muscles";

function durationMinutes(startedAt: string, completedAt: string | null) {
  if (!completedAt) return null;
  const diff = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  return Math.max(0, Math.round(diff / 60000));
}

function formatWorkoutDate(value: string) {
  const date = new Date(value);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${weekdays[date.getUTCDay()]}, ${date.getUTCDate()} ${months[date.getUTCMonth()]}`;
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
  const tone = sessionTone(workout.muscleGroups);
  const minutes = durationMinutes(workout.startedAt, workout.completedAt);

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

  const stats = [
    workout.totalVolume > 0
      ? { value: (workout.totalVolume / 1000).toFixed(1), unit: "t", label: "Volume" }
      : { value: String(workout.setCount), unit: "", label: "Sets" },
    { value: String(workout.exerciseCount), unit: "", label: workout.exerciseCount === 1 ? "Exercise" : "Exercises" },
    minutes === null ? { value: "Live", unit: "", label: "In progress" } : { value: String(minutes), unit: "min", label: "Duration" },
  ];

  return (
    <>
      <Link
        href={`/app/workouts/${workout.id}`}
        className="relative block overflow-hidden rounded-3xl bg-card p-5 pl-6 shadow-soft transition-transform active:scale-[0.99] dark:ring-1 dark:ring-white/5"
      >
        {/* session tone stripe */}
        <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1.5", TONE_BG[tone])} />
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{formatWorkoutDate(workout.startedAt)}</p>
            <p className="mt-1 truncate font-display text-2xl">{workout.name}</p>
          </div>
          <button
            type="button"
            onClick={requestDelete}
            disabled={pending}
            aria-label={`Delete ${workout.name}`}
            className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-muted/60 px-3 py-2.5">
              <dt className="text-xs text-muted-foreground">{stat.label}</dt>
              <dd className="mt-0.5 flex items-baseline gap-0.5">
                <span className="font-display tabular text-xl">{stat.value}</span>
                {stat.unit && <span className="text-xs text-muted-foreground">{stat.unit}</span>}
              </dd>
            </div>
          ))}
        </dl>

        {workout.muscleGroups.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {workout.muscleGroups.map((mg) => (
              <MuscleChip key={mg} muscle={mg} />
            ))}
          </div>
        )}
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
