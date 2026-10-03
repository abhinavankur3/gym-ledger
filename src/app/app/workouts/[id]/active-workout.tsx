"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addSet, deleteSet, removeExerciseFromWorkout, completeWorkout, getLastPerformance } from "../actions";
import { Button } from "@/components/ui/button";
import { ExercisePicker } from "@/components/exercise-picker";
import { cn } from "@/lib/utils";
import { Plus, Minus, Trophy, Check, X, ChevronLeft, Loader2, Undo2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { RestTimer, restDeadline } from "./rest-timer";
import { SessionHero } from "@/components/session-hero";
import { MuscleChip } from "@/components/muscle-chip";
import { sessionTone } from "@/lib/muscles";
import {
  exerciseKind,
  needsInput,
  parseRepRange,
  suggestSet,
  weightIncrement,
  type ExerciseKind,
  type PastSet,
  type Suggestion,
  deloadSets,
  deloadSuggestion,
} from "@/lib/set-suggestions";

const TONE_ART = { push: "dumbbell", pull: "kettlebell", legs: "plate", sun: "kettlebell" } as const;
const SET_TYPE_LABEL: Record<string, string> = { warmup: "Warm-up", dropset: "Drop set", failure: "To failure" };
const DEFAULT_SET_COUNT = 3;

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

type TemplateExercise = {
  exerciseId: number;
  name: string;
  category: string;
  primaryMuscleGroup: string;
  targetSets: number | null;
  targetReps: string | null;
  targetWeight: number | null;
};

/** A set shown as done: either confirmed by the server (has id) or just tapped (optimistic). */
type DoneSet = {
  id?: number;
  setNumber: number;
  setType: string;
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
  isPr: boolean;
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
  lastPerformance: Record<number, PastSet[]>;
  /** Session date formatted in the user's time zone on the server */
  dateLabel: string;
  /** This workout falls in an accepted deload (lighter) week */
  deload?: boolean;
};

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

function formatWeight(weight: number) {
  return Number.isInteger(weight) ? String(weight) : weight.toFixed(1).replace(/\.0$/, "");
}

export function ActiveWorkout({
  workout,
  setsByExercise,
  exerciseMap,
  allExercises,
  templateExercises,
  lastPerformance: initialLastPerformance,
  dateLabel,
  deload = false,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [finishing, setFinishing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [removeExerciseId, setRemoveExerciseId] = useState<number | null>(null);
  const [addedExerciseIds, setAddedExerciseIds] = useState<number[]>([]);
  const [lastPerformance, setLastPerformance] = useState(initialLastPerformance);
  // Extra rows the user added beyond the plan, per exercise
  const [extraRows, setExtraRows] = useState<Record<number, number>>({});
  // Per-row overrides of the suggested numbers, keyed `${exerciseId}:${setNumber}`
  const [edits, setEdits] = useState<Record<string, Suggestion>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  // Optimistic state: sets tapped done but not yet in server props, and sets being undone
  const [localDone, setLocalDone] = useState<Record<number, DoneSet[]>>({});
  const [undoneIds, setUndoneIds] = useState<number[]>([]);
  const [pendingKeys, setPendingKeys] = useState<string[]>([]);
  // Planned exercises the user removed from this session
  const [hiddenIds, setHiddenIds] = useState<number[]>([]);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const changeRest = useCallback((endsAt: number | null) => setRestEndsAt(endsAt), []);
  const isCompleted = !!workout.completedAt;

  const loggedExerciseIds = Object.keys(setsByExercise).map(Number);
  const templateIds = (templateExercises ?? []).map((t) => t.exerciseId);
  const displayIds = [
    ...templateIds,
    ...loggedExerciseIds.filter((id) => !templateIds.includes(id)),
    ...addedExerciseIds.filter((id) => !templateIds.includes(id) && !loggedExerciseIds.includes(id)),
  ].filter((id) => !hiddenIds.includes(id) && (!isCompleted || loggedExerciseIds.includes(id)));

  function exerciseInfo(exerciseId: number) {
    const template = templateExercises?.find((t) => t.exerciseId === exerciseId);
    const exercise = exerciseMap[exerciseId] ?? allExercises.find((e) => e.id === exerciseId);
    const name = exercise?.name ?? template?.name ?? "Exercise";
    const category = exercise?.category ?? template?.category ?? "other";
    return {
      name,
      category,
      muscle: exercise?.primaryMuscleGroup ?? template?.primaryMuscleGroup ?? "",
      kind: exerciseKind(category, name),
      template,
    };
  }

  function doneSetsFor(exerciseId: number): DoneSet[] {
    const server: DoneSet[] = (setsByExercise[exerciseId] ?? []).filter((s) => !undoneIds.includes(s.id));
    const local = (localDone[exerciseId] ?? []).filter((l) => !server.some((s) => s.setNumber === l.setNumber));
    return [...server, ...local].sort((a, b) => a.setNumber - b.setNumber);
  }

  function rowCount(exerciseId: number, done: DoneSet[]) {
    const { template } = exerciseInfo(exerciseId);
    const basePlanned = template?.targetSets ?? lastPerformance[exerciseId]?.length ?? DEFAULT_SET_COUNT;
    const planned = deload ? deloadSets(basePlanned) : basePlanned;
    const highestDone = done.at(-1)?.setNumber ?? 0;
    if (isCompleted) return highestDone;
    return Math.max(planned, highestDone) + (extraRows[exerciseId] ?? 0);
  }

  function suggestionFor(exerciseId: number, setNumber: number, done: DoneSet[]): Suggestion {
    const key = `${exerciseId}:${setNumber}`;
    if (edits[key]) return edits[key];
    const { kind, category, template } = exerciseInfo(exerciseId);
    const suggestion = suggestSet({
      setIndex: setNumber - 1,
      kind,
      category,
      targetReps: template?.targetReps,
      targetWeight: template?.targetWeight,
      doneThisWorkout: done.filter((s) => s.setNumber < setNumber && s.setType !== "warmup"),
      lastSession: lastPerformance[exerciseId] ?? [],
    });
    return deload && kind === "weighted" ? deloadSuggestion(suggestion, category) : suggestion;
  }

  function logSet(exerciseId: number, setNumber: number, values: Suggestion) {
    const key = `${exerciseId}:${setNumber}`;
    const optimistic: DoneSet = { setNumber, setType: "working", weight: values.weight, reps: values.reps, durationSeconds: values.durationSeconds, isPr: false };
    setEditingKey(null);
    setPendingKeys((keys) => [...keys, key]);
    setLocalDone((prev) => ({ ...prev, [exerciseId]: [...(prev[exerciseId] ?? []), optimistic] }));
    navigator.vibrate?.(12);
    setRestEndsAt(restDeadline());

    const rollback = (message: string) => {
      setLocalDone((prev) => ({ ...prev, [exerciseId]: (prev[exerciseId] ?? []).filter((s) => s.setNumber !== setNumber) }));
      toast.error(message);
    };

    startTransition(async () => {
      try {
        const result = await addSet(workout.id, exerciseId, {
          setNumber,
          setType: "working",
          weight: values.weight ?? undefined,
          reps: values.reps ?? undefined,
          durationSeconds: values.durationSeconds ?? undefined,
        });
        if (result?.error) {
          rollback(result.error);
          return;
        }
        if (result?.isPr) toast.success("New personal record");
        router.refresh();
      } catch {
        // Network or server failure: the set wasn't saved, so don't show it as done
        rollback("That set wasn't saved. Check your connection and tap again.");
      } finally {
        setPendingKeys((keys) => keys.filter((k) => k !== key));
      }
    });
  }

  function undoSet(exerciseId: number, set: DoneSet) {
    if (!set.id) return;
    const id = set.id;
    setUndoneIds((ids) => [...ids, id]);
    setLocalDone((prev) => ({ ...prev, [exerciseId]: (prev[exerciseId] ?? []).filter((s) => s.setNumber !== set.setNumber) }));
    // Restore the numbers they had so re-logging is still one tap
    setEdits((prev) => ({ ...prev, [`${exerciseId}:${set.setNumber}`]: { weight: set.weight, reps: set.reps, durationSeconds: set.durationSeconds } }));
    startTransition(async () => {
      await deleteSet(id);
      router.refresh();
    });
  }

  function handleRemoveExercise(exerciseId: number) {
    setAddedExerciseIds((prev) => prev.filter((id) => id !== exerciseId));
    setHiddenIds((prev) => [...prev, exerciseId]);
    // Forget everything shown for it, so re-adding it starts clean (no ghost sets)
    const prefix = `${exerciseId}:`;
    setLocalDone((prev) => {
      const next = { ...prev };
      delete next[exerciseId];
      return next;
    });
    setExtraRows((prev) => {
      const next = { ...prev };
      delete next[exerciseId];
      return next;
    });
    setEdits((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => !key.startsWith(prefix))));
    setUndoneIds((prev) => [...prev, ...(setsByExercise[exerciseId] ?? []).map((s) => s.id)]);
    if ((setsByExercise[exerciseId] ?? []).length > 0 || templateIds.includes(exerciseId)) {
      startTransition(async () => {
        await removeExerciseFromWorkout(workout.id, exerciseId);
        router.refresh();
      });
    }
  }

  function handleComplete() {
    setFinishing(true);
    startTransition(async () => {
      await completeWorkout(workout.id);
      toast.success("Workout finished");
      router.push("/app/workouts");
    });
  }

  function handlePickExercise(exerciseId: number) {
    setAddedExerciseIds((prev) => (prev.includes(exerciseId) ? prev : [...prev, exerciseId]));
    setHiddenIds((prev) => prev.filter((id) => id !== exerciseId));
    setPickerOpen(false);
    if (!lastPerformance[exerciseId]) {
      getLastPerformance([exerciseId], workout.id).then((result) =>
        setLastPerformance((prev) => ({ ...prev, ...result }))
      );
    }
  }

  // Progress across every planned row
  let totalRows = 0;
  let doneRows = 0;
  for (const id of displayIds) {
    const done = doneSetsFor(id);
    totalRows += rowCount(id, done);
    doneRows += done.length;
  }
  const allDone = totalRows > 0 && doneRows >= totalRows;

  const tone = sessionTone(displayIds.map((id) => exerciseInfo(id).muscle).filter(Boolean));

  return (
    <main className="pb-6">
      <div className="flex items-center justify-between pt-6 pb-4 md:pt-10">
        <Link href="/app/workouts" className="-ml-2 inline-flex h-10 items-center gap-0.5 rounded-xl pr-3 pl-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" /> Training log
        </Link>
        {!isCompleted && (
          <Button onClick={handleComplete} disabled={finishing || doneRows === 0} variant={allDone ? "default" : "outline"}>
            {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Finish
          </Button>
        )}
      </div>

      <SessionHero
        tone={tone}
        kicker={isCompleted ? `Finished, ${dateLabel}` : dateLabel}
        title={workout.name}
        art={TONE_ART[tone]}
        meta={isCompleted ? `${doneRows} sets logged` : allDone ? "Every set done" : `${doneRows} of ${totalRows} sets done`}
      />

      {!isCompleted && totalRows > 0 && (
        <div className="mt-16" aria-hidden>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-legs transition-[width] duration-300" style={{ width: `${Math.min(100, (doneRows / totalRows) * 100)}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Tap the circle when a set is done. Tap the numbers to change them.</p>
          {deload && (
            <p className="mt-3 rounded-2xl bg-sun/25 px-4 py-3 text-sm">
              <span className="font-semibold">Lighter week.</span> Weights are about 10% down and there&apos;s one fewer set per exercise, so you recover and come back stronger.
            </p>
          )}
        </div>
      )}

      <div className={cn("space-y-4", isCompleted || totalRows === 0 ? "mt-16" : "mt-5")}>
        {displayIds.map((exerciseId) => {
          const info = exerciseInfo(exerciseId);
          const done = doneSetsFor(exerciseId);
          const count = rowCount(exerciseId, done);
          const range = parseRepRange(info.template?.targetReps);
          // A finished workout shows only what was logged; gaps aren't tappable rows
          const setNumbers = isCompleted ? done.map((s) => s.setNumber) : Array.from({ length: count }, (_, i) => i + 1);
          const firstOpen = isCompleted ? undefined : setNumbers.find((n) => !done.some((s) => s.setNumber === n));
          const exerciseDone = count > 0 && !firstOpen;

          return (
            <section key={exerciseId} aria-label={info.name} className="rounded-3xl bg-card p-5 shadow-soft dark:ring-1 dark:ring-white/5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 font-display text-xl leading-tight">
                    {info.name}
                    {exerciseDone && !isCompleted && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-legs text-ink" aria-label="All sets done">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                    )}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {info.muscle && <MuscleChip muscle={info.muscle} />}
                    {info.template && (
                      <span className="text-sm text-muted-foreground">
                        Plan {info.template.targetSets ?? DEFAULT_SET_COUNT} × {range ? (range.min === range.max ? range.min : `${range.min}–${range.max}`) : info.template.targetReps ?? "—"}
                        {info.kind === "duration" && range ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
                {!isCompleted && (
                  <button
                    type="button"
                    onClick={() => setRemoveExerciseId(exerciseId)}
                    aria-label={`Remove ${info.name} from workout`}
                    className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <ol className="mt-4 space-y-2">
                {setNumbers.map((setNumber) => {
                  const key = `${exerciseId}:${setNumber}`;
                  const doneSet = done.find((s) => s.setNumber === setNumber);
                  if (doneSet) {
                    return (
                      <DoneRow
                        key={key}
                        set={doneSet}
                        kind={info.kind}
                        saving={pendingKeys.includes(key)}
                        canUndo={!isCompleted && !!doneSet.id}
                        onUndo={() => undoSet(exerciseId, doneSet)}
                      />
                    );
                  }
                  const suggestion = suggestionFor(exerciseId, setNumber, done);
                  return (
                    <PlannedRow
                      key={key}
                      setNumber={setNumber}
                      kind={info.kind}
                      suggestion={suggestion}
                      isNext={setNumber === firstOpen}
                      editing={editingKey === key}
                      increment={weightIncrement(info.category)}
                      onEdit={() => setEditingKey(editingKey === key ? null : key)}
                      onChange={(next) => setEdits((prev) => ({ ...prev, [key]: { ...next, hint: undefined } }))}
                      onDone={() => (needsInput(info.kind, suggestion) ? setEditingKey(key) : logSet(exerciseId, setNumber, suggestion))}
                    />
                  );
                })}
              </ol>

              {!isCompleted && (
                <button
                  type="button"
                  onClick={() => setExtraRows((prev) => ({ ...prev, [exerciseId]: (prev[exerciseId] ?? 0) + 1 }))}
                  className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-primary hover:bg-muted"
                >
                  <Plus className="h-4 w-4" /> Add a set
                </button>
              )}
            </section>
          );
        })}
      </div>

      {displayIds.length === 0 && (
        <p className="rounded-3xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No exercises yet. Add the first one you’re about to do.
        </p>
      )}

      {!isCompleted && (
        <div className="mt-4 space-y-3">
          <Button variant="outline" onClick={() => setPickerOpen(true)} className="h-14 w-full border-2 border-dashed shadow-none">
            <Plus className="h-4 w-4" /> Add exercise
          </Button>
          {doneRows > 0 && (
            <Button onClick={handleComplete} disabled={finishing} size="lg" className="w-full">
              {finishing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} Finish workout
            </Button>
          )}
        </div>
      )}

      {!isCompleted && <RestTimer endsAt={restEndsAt} onChange={changeRest} />}
      <ExercisePicker open={pickerOpen} onOpenChange={setPickerOpen} onSelect={handlePickExercise} exercises={allExercises} />
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

function SetValues({ kind, weight, reps, durationSeconds }: { kind: ExerciseKind; weight: number | null; reps: number | null; durationSeconds: number | null }) {
  if (kind === "duration") return <>{durationSeconds ? formatDuration(durationSeconds) : "—"}</>;
  return (
    <>
      {kind === "weighted" && (
        <>
          {weight != null ? formatWeight(weight) : "—"}
          <span className="font-sans text-sm font-medium text-muted-foreground">kg</span>
          <span className="font-sans text-base text-muted-foreground">×</span>
        </>
      )}
      {weight != null && kind === "bodyweight" && (
        <>
          +{formatWeight(weight)}
          <span className="font-sans text-sm font-medium text-muted-foreground">kg</span>
          <span className="font-sans text-base text-muted-foreground">×</span>
        </>
      )}
      {reps ?? "—"}
      {kind === "bodyweight" && weight == null && <span className="font-sans text-sm font-medium text-muted-foreground">reps</span>}
    </>
  );
}

function DoneRow({ set, kind, saving, canUndo, onUndo }: { set: DoneSet; kind: ExerciseKind; saving: boolean; canUndo: boolean; onUndo: () => void }) {
  const typeLabel = SET_TYPE_LABEL[set.setType];
  return (
    <li className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5", set.isPr ? "bg-sun/25 ring-1 ring-sun" : "bg-legs/12")}>
      <span aria-label={`Set ${set.setNumber} done`} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-legs text-ink">
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-1.5 font-display tabular text-2xl">
          <SetValues kind={kind} weight={set.weight} reps={set.reps} durationSeconds={set.durationSeconds} />
        </span>
        <span className="text-xs text-muted-foreground">Set {set.setNumber}{typeLabel ? `, ${typeLabel.toLowerCase()}` : ""}</span>
      </span>
      {set.isPr && (
        <span className="inline-flex h-7 items-center gap-1 rounded-full bg-sun px-2.5 text-xs font-bold text-ink">
          <Trophy className="h-3.5 w-3.5" /> PR
        </span>
      )}
      {canUndo && (
        <button
          type="button"
          onClick={onUndo}
          aria-label={`Undo set ${set.setNumber}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        >
          <Undo2 className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

function PlannedRow({
  setNumber,
  kind,
  suggestion,
  isNext,
  editing,
  increment,
  onEdit,
  onChange,
  onDone,
}: {
  setNumber: number;
  kind: ExerciseKind;
  suggestion: Suggestion;
  isNext: boolean;
  editing: boolean;
  increment: number;
  onEdit: () => void;
  onChange: (next: Suggestion) => void;
  onDone: () => void;
}) {
  const missing = needsInput(kind, suggestion);
  return (
    <li className={cn("rounded-2xl", isNext ? "bg-primary/8 ring-1 ring-primary/30" : "bg-muted/50", editing && "ring-2 ring-primary")}>
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          type="button"
          onClick={onDone}
          aria-label={missing ? `Set the numbers for set ${setNumber}` : `Mark set ${setNumber} done`}
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            isNext ? "border-primary bg-primary text-primary-foreground shadow-glow" : "border-muted-foreground/30 bg-card text-muted-foreground hover:border-primary hover:text-primary"
          )}
        >
          {isNext ? <Check className="h-5 w-5" strokeWidth={3} /> : <span className="text-sm font-bold">{setNumber}</span>}
        </button>
        <button type="button" onClick={onEdit} aria-expanded={editing} aria-label={`Change numbers for set ${setNumber}`} className="min-w-0 flex-1 rounded-xl py-1 text-left">
          <span className={cn("flex items-baseline gap-1.5 font-display tabular text-2xl", !isNext && "text-foreground/70")}>
            <SetValues kind={kind} {...suggestion} />
          </span>
          <span className="text-xs text-muted-foreground">
            {missing ? "Tap to set your starting weight" : suggestion.hint ?? `Set ${setNumber}`}
          </span>
        </button>
      </div>
      {editing && <SetEditor kind={kind} value={suggestion} increment={increment} onChange={onChange} onSave={onDone} setNumber={setNumber} />}
    </li>
  );
}

function SetEditor({ kind, value, increment, onChange, onSave, setNumber }: { kind: ExerciseKind; value: Suggestion; increment: number; onChange: (next: Suggestion) => void; onSave: () => void; setNumber: number }) {
  const ready = !needsInput(kind, value);
  return (
    <div className="space-y-3 border-t border-border px-3 pt-3 pb-3">
      {kind === "duration" ? (
        <Stepper
          label="Time (seconds)"
          value={value.durationSeconds}
          step={15}
          min={5}
          display={(v) => formatDuration(v)}
          onChange={(v) => onChange({ ...value, durationSeconds: v })}
        />
      ) : (
        <>
          <Stepper
            label={kind === "bodyweight" ? "Added weight (kg)" : "Weight (kg)"}
            value={value.weight}
            step={increment}
            min={0}
            onChange={(v) => onChange({ ...value, weight: kind === "bodyweight" && v === 0 ? null : v })}
          />
          <Stepper label="Reps" value={value.reps} step={1} min={1} onChange={(v) => onChange({ ...value, reps: v })} />
        </>
      )}
      <Button onClick={onSave} disabled={!ready} className="h-12 w-full">
        <Check className="h-4 w-4" /> Log set {setNumber}
      </Button>
    </div>
  );
}

function Stepper({ label, value, step, min, display, onChange }: { label: string; value: number | null; step: number; min: number; display?: (v: number) => string; onChange: (v: number | null) => void }) {
  const id = label.toLowerCase().replace(/\W+/g, "-");
  const current = value ?? 0;
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="w-28 shrink-0 text-sm font-medium text-muted-foreground">{label}</label>
      <button type="button" aria-label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, +(current - step).toFixed(2)))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card shadow-soft">
        <Minus className="h-4 w-4" />
      </button>
      {display ? (
        <output id={id} className="flex-1 text-center font-display tabular text-2xl">{value != null ? display(value) : "—"}</output>
      ) : (
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={value ?? ""}
          placeholder="—"
          onChange={(e) => {
            const next = e.target.valueAsNumber;
            onChange(Number.isFinite(next) ? next : null);
          }}
          className="h-11 w-full min-w-0 flex-1 rounded-xl border border-input bg-card text-center font-display tabular text-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      )}
      <button type="button" aria-label={`Increase ${label}`} onClick={() => onChange(+(current + step).toFixed(2))} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card shadow-soft">
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
