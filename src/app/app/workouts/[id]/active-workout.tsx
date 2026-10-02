"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSet, deleteSet, removeExerciseFromWorkout, completeWorkout } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExercisePicker } from "@/components/exercise-picker";
import { BlurFade } from "@/components/ui/blur-fade";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Trophy, Check, CheckCircle, X, ArrowLeft } from "lucide-react";
import Link from "next/link";
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
        toast.success("New PR! 🏆", { duration: 3000 });
      } else if (result?.success) {
        toast.success("Set logged!");
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
      toast.success("Workout complete!");
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

  return (
    <div className="mx-auto max-w-4xl px-4 pt-5 pb-24 sm:px-6 lg:px-10">
      <BlurFade delay={0}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/app/workouts" className="mb-3 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Workouts
            </Link>
            <h1 className="text-3xl font-bold tracking-tight">{workout.name}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(workout.startedAt).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
              {isCompleted && " · Completed"}
            </p>
          </div>
          {!isCompleted && (
            <Button
              onClick={handleComplete}
              disabled={pending || loggedExerciseIds.length === 0}
              size="sm"
              className="rounded-xl bg-primary px-4 font-bold text-primary-foreground hover:bg-primary/90 gap-1.5"
            >
              <CheckCircle className="h-4 w-4" />
              Finish
            </Button>
          )}
        </div>
      </BlurFade>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-2xl font-bold">{loggedSetCount}</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Sets logged</p>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3">
          <p className="text-2xl font-bold">{plannedSetCount || "—"}</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Target sets</p>
        </div>
      </div>

      {/* Exercise sections */}
      <div className="mt-6 space-y-4">
        {allDisplayIds.map((exerciseId, i) => {
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

          return (
            <BlurFade key={exerciseId} delay={0.05 * (i + 1)}>
              <Card
                className={cn(
                  "surface rounded-3xl",
                  isGhost
                    ? "border-dashed border-border/70"
                    : "border-border"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex-1 min-w-0 truncate text-lg">
                      {displayName}
                      {isGhost && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (planned)
                        </span>
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {displayMuscle && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px]",
                            MUSCLE_GROUP_COLORS[displayMuscle]
                          )}
                        >
                          {displayMuscle.replace("_", " ")}
                        </Badge>
                      )}
                      {!isCompleted && (
                        <button
                          type="button"
                          onClick={() => setRemoveExerciseId(exerciseId)}
                          disabled={pending}
                          aria-label="Remove exercise from workout"
                          className="-mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {isGhost && ghostData && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Target: {ghostData.targetSets ?? 3} sets x{" "}
                      {ghostData.targetReps ?? "?"} reps
                      {ghostData.targetWeight
                        ? ` @ ${ghostData.targetWeight}kg`
                        : ""}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {(() => {
                    const exerciseCategory = exercise?.category ?? ghostData?.primaryMuscleGroup ?? "";
                    const isDuration = isDurationExercise(exerciseCategory, displayName);

                    return (
                      <>
                        {/* Set headers */}
                        {sets.length > 0 && (
                          <div className={cn(
                            "grid gap-2 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground",
                            isDuration
                              ? "grid-cols-[2rem_1fr_1fr_2rem]"
                              : "grid-cols-[2rem_1fr_1fr_1fr_2rem]"
                          )}>
                            <span>Set</span>
                            {isDuration ? (
                              <>
                                <span>Duration</span>
                                <span>Type</span>
                              </>
                            ) : (
                              <>
                                <span>Weight</span>
                                <span>Reps</span>
                                <span>Type</span>
                              </>
                            )}
                            <span />
                          </div>
                        )}

                        {/* Logged sets */}
                        {sets.map((set) => (
                          <div
                            key={set.id}
                            className={cn(
                              "grid items-center gap-2 rounded-xl px-2 py-2 text-sm",
                              isDuration
                                ? "grid-cols-[2rem_1fr_1fr_2rem]"
                                : "grid-cols-[2rem_1fr_1fr_1fr_2rem]",
                              set.isPr && "border border-primary/25 bg-primary/10"
                            )}
                          >
                            <span className="text-muted-foreground text-xs">
                              {set.setNumber}
                            </span>
                            {isDuration ? (
                              <>
                                <span className="font-medium">
                                  {set.durationSeconds
                                    ? formatDurationDisplay(set.durationSeconds)
                                    : "—"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {set.setType}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="font-medium">
                                  {set.weight ?? "—"}
                                </span>
                                <span className="font-medium">{set.reps ?? "—"}</span>
                                <span className="text-xs text-muted-foreground">
                                  {set.setType}
                                  {set.isPr && (
                                    <Trophy className="inline ml-1 h-3 w-3 text-amber-400" />
                                  )}
                                </span>
                              </>
                            )}
                            {!isCompleted && (
                              <button
                                onClick={() => handleDeleteSet(set.id)}
                                className="text-muted-foreground hover:text-destructive transition-colors"
                                disabled={pending}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}

                        {/* Add set row */}
                        {!isCompleted && (
                          <div className={cn(
                            "gap-2 items-center pt-1 grid",
                            isDuration
                              ? "grid-cols-[2rem_1fr_1fr_2rem]"
                              : "grid-cols-[2rem_1fr_1fr_1fr_2rem]"
                          )}>
                            <span className="text-muted-foreground text-xs">
                              {sets.length + 1}
                            </span>
                            {isDuration ? (
                              <>
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  placeholder="min"
                                  value={getNewSet(exerciseId).duration}
                                  onChange={(e) =>
                                    updateNewSet(exerciseId, "duration", e.target.value)
                                  }
                                  className="h-10 rounded-xl border-border bg-background text-sm"
                                />
                                <Select
                                  value={getNewSet(exerciseId).setType}
                                  onValueChange={(v) => {
                                    if (!v) return;
                                    updateNewSet(exerciseId, "setType", v);
                                  }}
                                >
                                    <SelectTrigger className="h-10 rounded-xl border-border bg-background text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="working">Working</SelectItem>
                                    <SelectItem value="warmup">Warmup</SelectItem>
                                  </SelectContent>
                                </Select>
                              </>
                            ) : (
                              <>
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  placeholder="kg"
                                  value={getNewSet(exerciseId).weight}
                                  onChange={(e) =>
                                    updateNewSet(exerciseId, "weight", e.target.value)
                                  }
                                  className="h-10 rounded-xl border-border bg-background text-sm"
                                />
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  placeholder="reps"
                                  value={getNewSet(exerciseId).reps}
                                  onChange={(e) =>
                                    updateNewSet(exerciseId, "reps", e.target.value)
                                  }
                                  className="h-10 rounded-xl border-border bg-background text-sm"
                                />
                                <Select
                                  value={getNewSet(exerciseId).setType}
                                  onValueChange={(v) => {
                                    if (!v) return;
                                    updateNewSet(exerciseId, "setType", v);
                                  }}
                                >
                                  <SelectTrigger className="h-10 rounded-xl border-border bg-background text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="warmup">Warmup</SelectItem>
                                    <SelectItem value="working">Working</SelectItem>
                                    <SelectItem value="dropset">Drop</SelectItem>
                                    <SelectItem value="failure">Failure</SelectItem>
                                  </SelectContent>
                                </Select>
                              </>
                            )}
                            <button
                              onClick={() => handleAddSet(exerciseId)}
                              disabled={pending}
                              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </BlurFade>
          );
        })}
      </div>

      {/* Add Exercise */}
      {!isCompleted && (
        <div className="mt-6">
          <Button
            variant="outline"
            onClick={() => setPickerOpen(true)}
            className="h-12 w-full rounded-2xl border-dashed border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Exercise
          </Button>
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
    </div>
  );
}
