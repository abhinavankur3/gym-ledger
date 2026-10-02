"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSet, deleteSet, removeExerciseFromWorkout, completeWorkout } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExercisePicker } from "@/components/exercise-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Trophy, Check, X, ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { SessionHero } from "@/components/session-hero";
import { MuscleChip } from "@/components/muscle-chip";
import { sessionTone } from "@/lib/muscles";

const TONE_ART = { push: "dumbbell", pull: "kettlebell", legs: "plate", sun: "kettlebell" } as const;
const SET_TYPE_LABEL: Record<string, string> = { warmup: "Warm-up", working: "Working", dropset: "Drop set", failure: "To failure" };

type Exercise = {
  id: number;
  name: string;
  category: string;
  primaryMuscleGroup: string;
};

type WorkoutSet = {
  id: number;
  workoutId: number;
  exerciseId: number;
  setNumber: number;
  setType: string;
  reps: number | null;
  weight: number | null;
  durationSeconds: number | null;
  rpe: number | null;
  isPr: boolean;
  completedAt: string;
};

// Exercises where we log duration instead of weight/reps
function isDurationExercise(category: string, name?: string) {
  if (category === "cardio") return true;
  // Timed bodyweight exercises
  const timedExercises = ["plank", "dead bug"];
  if (name && timedExercises.includes(name.toLowerCase())) return true;
  return false;
}

function formatDurationDisplay(seconds: number) {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  }
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  return `${seconds}s`;
}

type TemplateExercise = {
  exerciseId: number;
  name: string;
  primaryMuscleGroup: string;
  targetSets: number | null;
  targetReps: string | null;
  targetWeight: number | null;
};

type Props = {
  workout: {
    id: number;
    name: string;
    startedAt: string;
    completedAt: string | null;
  };
  setsByExercise: Record<number, WorkoutSet[]>;
  exerciseMap: Record<number, Exercise>;
  allExercises: Exercise[];
  templateExercises?: TemplateExercise[];
};

export function ActiveWorkout({
  workout,
  setsByExercise,
  exerciseMap,
  allExercises,
  templateExercises,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removeExerciseId, setRemoveExerciseId] = useState<number | null>(null);
  const [addedExerciseIds, setAddedExerciseIds] = useState<number[]>([]);
  const isCompleted = !!workout.completedAt;

  // New set form state per exercise
  const [newSets, setNewSets] = useState<
    Record<number, { weight: string; reps: string; duration: string; setType: string }>
  >({});

  function getNewSet(exerciseId: number) {
    if (newSets[exerciseId]) return newSets[exerciseId];

    // Pre-fill from template targets if available
    const te = templateExercises?.find((t) => t.exerciseId === exerciseId);
    if (te) {
      const repsDefault = te.targetReps
        ? te.targetReps.includes("-")
          ? te.targetReps.split("-")[1]
          : te.targetReps
        : "";
      return {
        weight: te.targetWeight ? String(te.targetWeight) : "",
        reps: repsDefault,
        duration: "",
        setType: "working",
      };
    }

    return { weight: "", reps: "", duration: "", setType: "working" };
  }

  function updateNewSet(
    exerciseId: number,
    field: string,
    value: string
  ) {
    setNewSets((prev) => ({
      ...prev,
      [exerciseId]: { ...getNewSet(exerciseId), [field]: value },
    }));
  }

  function handleAddSet(exerciseId: number) {
    const setData = getNewSet(exerciseId);
    const existingSets = setsByExercise[exerciseId] || [];

    startTransition(async () => {
      const result = await addSet(workout.id, exerciseId, {
        setNumber: existingSets.length + 1,
        setType: setData.setType as "warmup" | "working" | "dropset" | "failure",
        reps: setData.reps ? Number(setData.reps) : undefined,
        weight: setData.weight ? Number(setData.weight) : undefined,
        durationSeconds: setData.duration ? Number(setData.duration) * 60 : undefined,
      });

      if (result?.isPr) {
        toast.success("New personal record", { duration: 3000 });
      } else if (result?.success) {
        toast.success("Set logged");
      }

      // Reset form for this exercise
      setNewSets((prev) => ({
        ...prev,
        [exerciseId]: { weight: "", reps: "", duration: "", setType: "working" },
      }));

      router.refresh();
    });
  }

  function handleDeleteSet(setId: number) {
    startTransition(async () => {
      await deleteSet(setId);
      router.refresh();
    });
  }

  function handleRemoveExercise(exerciseId: number) {
    const hasSets = (setsByExercise[exerciseId] || []).length > 0;
    if (hasSets) {
      startTransition(async () => {
        await removeExerciseFromWorkout(workout.id, exerciseId);
        setAddedExerciseIds((prev) => prev.filter((id) => id !== exerciseId));
        router.refresh();
      });
    } else {
      setAddedExerciseIds((prev) => prev.filter((id) => id !== exerciseId));
    }
  }

  function handleComplete() {
    startTransition(async () => {
      await completeWorkout(workout.id);
      toast.success("Workout finished");
      router.push("/app/workouts");
    });
  }

  function handlePickExercise(exerciseId: number) {
    setAddedExerciseIds((prev) =>
      prev.includes(exerciseId) ? prev : [...prev, exerciseId]
    );
    setPickerOpen(false);
  }

  // Build the list of exercise IDs to display
  const loggedExerciseIds = Object.keys(setsByExercise).map(Number);

  // Ghost exercises from template that haven't been logged yet
  const ghostExercises: TemplateExercise[] = [];
  if (templateExercises && loggedExerciseIds.length === 0) {
    // Fresh workout: show all template exercises as ghosts
    for (const te of templateExercises) {
      if (!loggedExerciseIds.includes(te.exerciseId)) {
        ghostExercises.push(te);
      }
    }
  } else if (templateExercises) {
    // Partially started: show remaining template exercises as ghosts
    for (const te of templateExercises) {
      if (!loggedExerciseIds.includes(te.exerciseId)) {
        ghostExercises.push(te);
      }
    }
  }

  // All exercise IDs to render (logged first, then ghosts, then manually added)
  const allDisplayIds = [
    ...loggedExerciseIds,
    ...ghostExercises.map((g) => g.exerciseId),
    ...addedExerciseIds.filter(
      (id) =>
        !loggedExerciseIds.includes(id) &&
        !ghostExercises.some((g) => g.exerciseId === id)
    ),
  ];

  const loggedSetCount = Object.values(setsByExercise).reduce(
    (total, sets) => total + sets.length,
    0
  );
  const plannedSetCount = templateExercises?.reduce(
    (total, exercise) => total + (exercise.targetSets ?? 0),
    0
  ) ?? 0;

  const tone = sessionTone([
    ...(templateExercises ?? []).map((t) => t.primaryMuscleGroup),
    ...loggedExerciseIds.map((id) => exerciseMap[id]?.primaryMuscleGroup).filter((m): m is string => !!m),
  ]);
  const dateLabel = new Date(workout.startedAt).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <main className="pb-6">
      <div className="flex items-center justify-between pt-6 pb-4 md:pt-10">
        <Link href="/app/workouts" className="-ml-2 inline-flex h-10 items-center gap-0.5 rounded-xl pr-3 pl-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" /> Training log
        </Link>
        {!isCompleted && (
          <Button onClick={handleComplete} disabled={pending || loggedExerciseIds.length === 0}>
            <Check className="h-4 w-4" /> Finish
          </Button>
        )}
      </div>

      <SessionHero
        tone={tone}
        kicker={isCompleted ? `Finished, ${dateLabel}` : dateLabel}
        title={workout.name}
        art={TONE_ART[tone]}
        meta={isCompleted ? "Completed" : "In progress"}
      />

      <dl className="mt-16 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-card p-4 shadow-soft dark:ring-1 dark:ring-white/5">
          <dt className="text-sm text-muted-foreground">Sets logged</dt>
          <dd className="mt-1 font-display tabular text-4xl">{loggedSetCount}</dd>
        </div>
        <div className="rounded-3xl bg-card p-4 shadow-soft dark:ring-1 dark:ring-white/5">
          <dt className="text-sm text-muted-foreground">Target sets</dt>
          <dd className="mt-1 font-display tabular text-4xl">{plannedSetCount || "—"}</dd>
        </div>
      </dl>

      {/* Exercise sections */}
      <div className="mt-6 space-y-4">
        {allDisplayIds.map((exerciseId) => {
          const exercise = exerciseMap[exerciseId] ?? allExercises.find((e) => e.id === exerciseId);
          const sets = setsByExercise[exerciseId] || [];
          const isGhost = !loggedExerciseIds.includes(exerciseId);
          const ghostData = ghostExercises.find(
            (g) => g.exerciseId === exerciseId
          );

          // For ghost/added exercises, use template data or allExercises for display
          const displayName = exercise?.name ?? ghostData?.name ?? "Unknown";
          const displayMuscle =
            exercise?.primaryMuscleGroup ??
            ghostData?.primaryMuscleGroup ??
            "";
          const exerciseCategory = exercise?.category ?? ghostData?.primaryMuscleGroup ?? "";
          const isDuration = isDurationExercise(exerciseCategory, displayName);
          const draft = getNewSet(exerciseId);

          return (
            <section
              key={exerciseId}
              aria-label={displayName}
              className={cn(
                "rounded-3xl bg-card p-5 shadow-soft dark:ring-1 dark:ring-white/5",
                isGhost && sets.length === 0 && "border-2 border-dashed border-border shadow-none"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-display text-xl leading-tight">{displayName}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {displayMuscle && <MuscleChip muscle={displayMuscle} />}
                    {isGhost && ghostData && (
                      <span className="text-sm text-muted-foreground">
                        Target {ghostData.targetSets ?? 3} × {ghostData.targetReps ?? "?"}
                        {ghostData.targetWeight ? ` at ${ghostData.targetWeight} kg` : ""}
                      </span>
                    )}
                  </div>
                </div>
                {!isCompleted && (
                  <button
                    type="button"
                    onClick={() => setRemoveExerciseId(exerciseId)}
                    disabled={pending}
                    aria-label={`Remove ${displayName} from workout`}
                    className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Logged sets */}
              {sets.length > 0 && (
                <ol className="mt-4 space-y-2">
                  {sets.map((set) => (
                    <li
                      key={set.id}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl px-3 py-2.5",
                        set.isPr ? "bg-sun/25 ring-1 ring-sun" : "bg-muted/60"
                      )}
                    >
                      <span
                        aria-label={`Set ${set.setNumber}`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-legs text-sm font-bold text-ink"
                      >
                        {set.setNumber}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-1.5 font-display tabular text-2xl">
                          {isDuration ? (
                            set.durationSeconds ? formatDurationDisplay(set.durationSeconds) : "—"
                          ) : (
                            <>
                              {set.weight ?? "—"}
                              <span className="font-sans text-sm font-medium text-muted-foreground">kg</span>
                              <span className="font-sans text-base text-muted-foreground">×</span>
                              {set.reps ?? "—"}
                            </>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">{SET_TYPE_LABEL[set.setType] ?? set.setType}</span>
                      </span>
                      {set.isPr && (
                        <span className="inline-flex h-7 items-center gap-1 rounded-full bg-sun px-2.5 text-xs font-bold text-ink">
                          <Trophy className="h-3.5 w-3.5" /> PR
                        </span>
                      )}
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSet(set.id)}
                          aria-label={`Delete set ${set.setNumber}`}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-background hover:text-destructive"
                          disabled={pending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
              )}

              {/* Add set */}
              {!isCompleted && (
                <div className="mt-4 rounded-2xl bg-muted/40 p-3">
                  <p className="mb-2 text-sm font-semibold">Set {sets.length + 1}</p>
                  {isDuration ? (
                    <Input
                      type="number"
                      inputMode="decimal"
                      placeholder="Minutes"
                      aria-label={`Minutes for set ${sets.length + 1}`}
                      value={draft.duration}
                      onChange={(e) => updateNewSet(exerciseId, "duration", e.target.value)}
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="Weight (kg)"
                        aria-label={`Weight in kg for set ${sets.length + 1}`}
                        value={draft.weight}
                        onChange={(e) => updateNewSet(exerciseId, "weight", e.target.value)}
                        className="tabular"
                      />
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="Reps"
                        aria-label={`Reps for set ${sets.length + 1}`}
                        value={draft.reps}
                        onChange={(e) => updateNewSet(exerciseId, "reps", e.target.value)}
                        className="tabular"
                      />
                    </div>
                  )}
                  <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
                    <Select
                      value={draft.setType}
                      onValueChange={(v) => {
                        if (!v) return;
                        updateNewSet(exerciseId, "setType", v);
                      }}
                    >
                      <SelectTrigger className="w-full" aria-label="Set type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="warmup">Warm-up</SelectItem>
                        <SelectItem value="working">Working</SelectItem>
                        {!isDuration && <SelectItem value="dropset">Drop set</SelectItem>}
                        {!isDuration && <SelectItem value="failure">To failure</SelectItem>}
                      </SelectContent>
                    </Select>
                    <Button onClick={() => handleAddSet(exerciseId)} disabled={pending} className="h-12">
                      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Log set
                    </Button>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {allDisplayIds.length === 0 && (
        <p className="mt-6 rounded-3xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No exercises yet. Add the first one you’re about to do.
        </p>
      )}

      {/* Add Exercise */}
      {!isCompleted && (
        <div className="mt-4 space-y-3">
          <Button
            variant="outline"
            onClick={() => setPickerOpen(true)}
            className="h-14 w-full border-2 border-dashed shadow-none"
          >
            <Plus className="h-4 w-4" />
            Add exercise
          </Button>
          {loggedExerciseIds.length > 0 && (
            <Button onClick={handleComplete} disabled={pending} size="lg" className="w-full">
              <Check className="h-5 w-5" /> Finish workout
            </Button>
          )}
        </div>
      )}

      {/* Exercise Picker */}
      <ExercisePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handlePickExercise}
        exercises={allExercises}
      />
      <ConfirmDialog
        open={removeExerciseId !== null}
        onOpenChange={(open) => !open && setRemoveExerciseId(null)}
        title="Remove this exercise?"
        description="Any sets you've logged for it in this workout will be deleted."
        confirmLabel="Remove"
        destructive
        onConfirm={() => removeExerciseId !== null && handleRemoveExercise(removeExerciseId)}
      />
    </main>
  );
}
