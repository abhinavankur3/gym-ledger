"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSet, deleteSet, completeWorkout } from "../actions";
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
import { Plus, Trash2, Trophy, Check } from "lucide-react";
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
  rpe: number | null;
  isPr: boolean;
  completedAt: string;
};

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
  const isCompleted = !!workout.completedAt;

  // New set form state per exercise
  const [newSets, setNewSets] = useState<
    Record<number, { weight: string; reps: string; setType: string }>
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
        setType: "working",
      };
    }

    return { weight: "", reps: "", setType: "working" };
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
      });

      if (result?.isPr) {
        toast.success("New PR! 🏆", { duration: 3000 });
      } else if (result?.success) {
        toast.success("Set logged!");
      }

      // Reset form for this exercise
      setNewSets((prev) => ({
        ...prev,
        [exerciseId]: { weight: "", reps: "", setType: "working" },
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

  function handleComplete() {
    startTransition(async () => {
      await completeWorkout(workout.id);
      toast.success("Workout complete!");
      router.push("/app/workouts");
    });
  }

  function handlePickExercise(exerciseId: number) {
    // Add an empty set to trigger the exercise appearing
    startTransition(async () => {
      await addSet(workout.id, exerciseId, {
        setNumber: 1,
        setType: "working",
      });
      router.refresh();
    });
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

  // All exercise IDs to render (logged first, then ghosts)
  const allDisplayIds = [
    ...loggedExerciseIds,
    ...ghostExercises.map((g) => g.exerciseId),
  ];

  return (
    <div className="px-4 pt-8 pb-24">
      <BlurFade delay={0}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {workout.name}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(workout.startedAt).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
              {isCompleted && " · Completed"}
            </p>
          </div>
        </div>
      </BlurFade>

      {/* Exercise sections */}
      <div className="mt-6 space-y-4">
        {allDisplayIds.map((exerciseId, i) => {
          const exercise = exerciseMap[exerciseId];
          const sets = setsByExercise[exerciseId] || [];
          const isGhost = !loggedExerciseIds.includes(exerciseId);
          const ghostData = ghostExercises.find(
            (g) => g.exerciseId === exerciseId
          );

          // For ghost exercises, use template data for display
          const displayName = exercise?.name ?? ghostData?.name ?? "Unknown";
          const displayMuscle =
            exercise?.primaryMuscleGroup ??
            ghostData?.primaryMuscleGroup ??
            "";

          return (
            <BlurFade key={exerciseId} delay={0.05 * (i + 1)}>
              <Card
                className={cn(
                  "surface rounded-2xl",
                  isGhost
                    ? "border-dashed border-white/10"
                    : "border-white/10"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      {displayName}
                      {isGhost && (
                        <span className="text-xs text-muted-foreground ml-2">
                          (planned)
                        </span>
                      )}
                    </CardTitle>
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
                  {/* Set headers */}
                  {sets.length > 0 && (
                    <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-2 text-[10px] text-muted-foreground uppercase tracking-wider px-1">
                      <span>Set</span>
                      <span>Weight</span>
                      <span>Reps</span>
                      <span>Type</span>
                      <span />
                    </div>
                  )}

                  {/* Logged sets */}
                  {sets.map((set) => (
                    <div
                      key={set.id}
                      className={cn(
                        "grid grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-2 items-center rounded-lg px-1 py-1.5 text-sm",
                        set.isPr && "bg-amber-500/10 border border-amber-500/20 rounded-xl"
                      )}
                    >
                      <span className="text-muted-foreground text-xs">
                        {set.setNumber}
                      </span>
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
                    <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-2 items-center pt-1">
                      <span className="text-muted-foreground text-xs">
                        {sets.length + 1}
                      </span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="kg"
                        value={getNewSet(exerciseId).weight}
                        onChange={(e) =>
                          updateNewSet(exerciseId, "weight", e.target.value)
                        }
                        className="h-9 rounded-lg bg-white/5 border-white/10 text-sm"
                      />
                      <Input
                        type="number"
                        inputMode="numeric"
                        placeholder="reps"
                        value={getNewSet(exerciseId).reps}
                        onChange={(e) =>
                          updateNewSet(exerciseId, "reps", e.target.value)
                        }
                        className="h-9 rounded-lg bg-white/5 border-white/10 text-sm"
                      />
                      <Select
                        value={getNewSet(exerciseId).setType}
                        onValueChange={(v) => {
                          if (!v) return;
                          updateNewSet(exerciseId, "setType", v);
                        }}
                      >
                        <SelectTrigger className="h-9 rounded-lg bg-white/5 border-white/10 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="warmup">Warmup</SelectItem>
                          <SelectItem value="working">Working</SelectItem>
                          <SelectItem value="dropset">Drop</SelectItem>
                          <SelectItem value="failure">Failure</SelectItem>
                        </SelectContent>
                      </Select>
                      <button
                        onClick={() => handleAddSet(exerciseId)}
                        disabled={pending}
                        className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary text-primary-foreground"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </BlurFade>
          );
        })}
      </div>

      {/* Actions */}
      {!isCompleted && (
        <div className="mt-6 space-y-3">
          <Button
            variant="outline"
            onClick={() => setPickerOpen(true)}
            className="w-full h-12 rounded-xl border-dashed border-white/20 text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Exercise
          </Button>

          <Button
            onClick={handleComplete}
            disabled={pending || (loggedExerciseIds.length === 0)}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90"
          >
            {pending ? "Finishing..." : "Finish Workout"}
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
    </div>
  );
}
