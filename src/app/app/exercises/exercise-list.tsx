"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MuscleChip } from "@/components/muscle-chip";
import { REGION_DOT, muscleLabel, muscleRegion } from "@/lib/muscles";
import { createCustomExercise } from "./actions";
import { toast } from "sonner";

const CATEGORIES = [
  "all",
  "barbell",
  "dumbbell",
  "machine",
  "cable",
  "bodyweight",
  "cardio",
  "other",
];

const MUSCLE_GROUPS = [
  "chest", "back", "shoulders", "biceps", "triceps", "quads",
  "hamstrings", "glutes", "calves", "core", "forearms", "full_body",
];

type Exercise = {
  id: number;
  name: string;
  category: string;
  primaryMuscleGroup: string;
  secondaryMuscleGroups: string | null;
  isCustom: boolean;
};

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function ExerciseList({ exercises }: { exercises: Exercise[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = useMemo(() => {
    return exercises.filter((e) => {
      if (search && !e.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (category !== "all" && e.category !== category) return false;
      return true;
    });
  }, [exercises, search, category]);

  const grouped = useMemo(() => {
    const groups: Record<string, Exercise[]> = {};
    for (const e of filtered) {
      const key = e.primaryMuscleGroup;
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  async function handleCreateExercise(formData: FormData) {
    const result = await createCustomExercise(formData);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Exercise added");
      setSheetOpen(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Search exercises"
            placeholder="Search exercises"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11 shadow-soft"
          />
        </div>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger render={<Button size="icon-lg" aria-label="Add a custom exercise" />}>
            <Plus className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="bottom" className="mx-auto max-w-2xl rounded-t-[2rem] border-border pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-lift">
            <SheetHeader className="px-6 pt-6">
              <SheetTitle className="font-display text-2xl">Add an exercise</SheetTitle>
            </SheetHeader>
            <form action={handleCreateExercise} className="space-y-4 px-6">
              <div className="space-y-2">
                <Label htmlFor="exercise-name">Name</Label>
                <Input id="exercise-name" name="name" required placeholder="e.g. Landmine Press" />
              </div>
              <div className="space-y-2">
                <Label>Equipment</Label>
                <Select name="category" required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter((c) => c !== "all").map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {capitalize(cat)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Main muscle group</Label>
                <Select name="primaryMuscleGroup" required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a muscle group" />
                  </SelectTrigger>
                  <SelectContent>
                    {MUSCLE_GROUPS.map((mg) => (
                      <SelectItem key={mg} value={mg}>
                        {muscleLabel(mg)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" size="lg" className="w-full">
                Add exercise
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      <div role="radiogroup" aria-label="Filter by equipment" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:-mx-6 sm:px-6">
        {CATEGORIES.map((cat) => (
          <button
            type="button"
            role="radio"
            aria-checked={category === cat}
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
              category === cat
                ? "bg-primary text-primary-foreground shadow-glow"
                : "bg-card text-muted-foreground shadow-soft hover:text-foreground"
            )}
          >
            {cat === "all" ? "All" : capitalize(cat)}
          </button>
        ))}
      </div>

      {grouped.map(([group, items]) => (
        <section key={group} aria-labelledby={`group-${group}`}>
          <h2 id={`group-${group}`} className="mb-3 flex items-center gap-2 font-display text-lg">
            <span aria-hidden className={cn("h-2.5 w-2.5 rounded-full", REGION_DOT[muscleRegion(group)])} />
            {muscleLabel(group)}
            <span className="tabular text-sm font-normal text-muted-foreground">{items.length}</span>
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-3xl bg-card shadow-soft dark:ring-1 dark:ring-white/5">
            {items.map((exercise) => (
              <li key={exercise.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{exercise.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {capitalize(exercise.category)}
                    {exercise.isCustom && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">Custom</span>}
                  </p>
                </div>
                <MuscleChip muscle={exercise.primaryMuscleGroup} className="shrink-0" />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {filtered.length === 0 && (
        <div className="rounded-3xl bg-card px-6 py-12 text-center shadow-soft">
          <p className="font-display text-xl">No exercises match</p>
          <p className="mt-2 text-sm text-muted-foreground">Try another search or equipment filter, or add it as a custom exercise.</p>
        </div>
      )}
    </div>
  );
}
