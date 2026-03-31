"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addTemplateExercise,
  updateTemplateExercise,
  removeTemplateExercise,
  moveTemplateExercise,
  deleteTemplate,
  renameTemplate,
} from "../actions";
import { ExercisePicker } from "@/components/exercise-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BlurFade } from "@/components/ui/blur-fade";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  Pencil,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

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

type TemplateExercise = {
  id: number;
  exerciseId: number;
  orderIndex: number;
  targetSets: number | null;
  targetReps: string | null;
  targetWeight: number | null;
  exercise: {
    id: number;
    name: string;
    category: string;
    primaryMuscleGroup: string;
  };
};

type Template = {
  id: number;
  name: string;
  description: string | null;
  exercises: TemplateExercise[];
};

type Exercise = {
  id: number;
  name: string;
  category: string;
  primaryMuscleGroup: string;
};

type Props = {
  template: Template;
  allExercises: Exercise[];
};

export function TemplateEditor({ template, allExercises }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(template.name);

  function handleRename() {
    if (!name.trim() || name.trim() === template.name) {
      setName(template.name);
      setEditing(false);
      return;
    }
    startTransition(async () => {
      await renameTemplate(template.id, name.trim());
      toast.success("Template renamed");
      setEditing(false);
      router.refresh();
    });
  }

  function handleAddExercise(exerciseId: number) {
    startTransition(async () => {
      const orderIndex = template.exercises.length;
      await addTemplateExercise(template.id, exerciseId, orderIndex);
      router.refresh();
    });
  }

  function handleUpdateExercise(
    id: number,
    field: string,
    value: string
  ) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set(field, value);
      await updateTemplateExercise(id, formData);
      router.refresh();
    });
  }

  function handleRemoveExercise(id: number) {
    startTransition(async () => {
      await removeTemplateExercise(id);
      router.refresh();
    });
  }

  function handleMoveExercise(id: number, direction: "up" | "down") {
    startTransition(async () => {
      await moveTemplateExercise(template.id, id, direction);
      router.refresh();
    });
  }

  function handleDeleteTemplate() {
    if (!confirm("Delete this template? This cannot be undone.")) return;
    startTransition(async () => {
      await deleteTemplate(template.id);
      toast.success("Template deleted");
      router.push("/app/workouts/templates");
    });
  }

  return (
    <div className="px-4 pt-8 pb-24">
      <BlurFade delay={0}>
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/app/workouts/templates"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          {editing ? (
            <div className="flex items-center gap-2 flex-1">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
                autoFocus
                className="h-9 rounded-xl bg-white/5 border-white/10 text-lg font-bold"
              />
              <button
                onClick={handleRename}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight truncate">
                {template.name}
              </h1>
              <button
                onClick={() => setEditing(true)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </BlurFade>

      {/* Exercise List */}
      <div className="space-y-3">
        {template.exercises.map((te, i) => (
          <BlurFade key={te.id} delay={0.05 * (i + 1)}>
            <Card className="surface border-white/10 rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {te.exercise.name}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px]",
                      MUSCLE_GROUP_COLORS[te.exercise.primaryMuscleGroup]
                    )}
                  >
                    {te.exercise.primaryMuscleGroup.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Sets
                    </label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      defaultValue={te.targetSets ?? ""}
                      onBlur={(e) =>
                        handleUpdateExercise(te.id, "targetSets", e.target.value)
                      }
                      className="h-9 rounded-lg bg-white/5 border-white/10 text-sm mt-1"
                      placeholder="3"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Reps
                    </label>
                    <Input
                      type="text"
                      defaultValue={te.targetReps ?? ""}
                      onBlur={(e) =>
                        handleUpdateExercise(te.id, "targetReps", e.target.value)
                      }
                      className="h-9 rounded-lg bg-white/5 border-white/10 text-sm mt-1"
                      placeholder="8-12"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Weight
                    </label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      defaultValue={te.targetWeight ?? ""}
                      onBlur={(e) =>
                        handleUpdateExercise(
                          te.id,
                          "targetWeight",
                          e.target.value
                        )
                      }
                      className="h-9 rounded-lg bg-white/5 border-white/10 text-sm mt-1"
                      placeholder="kg"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleMoveExercise(te.id, "up")}
                      disabled={pending || i === 0}
                      className="h-8 w-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleMoveExercise(te.id, "down")}
                      disabled={
                        pending || i === template.exercises.length - 1
                      }
                      className="h-8 w-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemoveExercise(te.id)}
                    disabled={pending}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          </BlurFade>
        ))}
      </div>

      {/* Add Exercise */}
      <div className="mt-6 space-y-3">
        <Button
          variant="outline"
          onClick={() => setPickerOpen(true)}
          disabled={pending}
          className="w-full h-12 rounded-xl border-dashed border-white/20 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Exercise
        </Button>

        <Button
          variant="outline"
          onClick={handleDeleteTemplate}
          disabled={pending}
          className="w-full h-10 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Template
        </Button>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleAddExercise}
        exercises={allExercises}
      />
    </div>
  );
}
