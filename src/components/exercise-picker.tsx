"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { REGION_DOT, muscleLabel, muscleRegion } from "@/lib/muscles";

type Exercise = {
  id: number;
  name: string;
  category: string;
  primaryMuscleGroup: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (exerciseId: number) => void;
  exercises: Exercise[];
};

export function ExercisePicker({ open, onOpenChange, onSelect, exercises }: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredExercises = exercises.filter(
    (e) =>
      !searchQuery ||
      e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedFiltered = filteredExercises.reduce(
    (acc, e) => {
      const key = e.primaryMuscleGroup;
      if (!acc[key]) acc[key] = [];
      acc[key].push(e);
      return acc;
    },
    {} as Record<string, Exercise[]>
  );

  function handleSelect(exerciseId: number) {
    onSelect(exerciseId);
    onOpenChange(false);
    setSearchQuery("");
  }

  const groups = Object.entries(groupedFiltered).sort(([a], [b]) => a.localeCompare(b));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[75vh] rounded-t-[2rem] border-border bg-background shadow-lift">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Add an exercise</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search exercises"
              aria-label="Search exercises"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11"
              autoFocus
            />
          </div>
          <div className="max-h-[calc(75vh-11rem)] space-y-5 overflow-y-auto pb-6">
            {groups.map(([group, items]) => (
              <section key={group} aria-labelledby={`picker-${group}`}>
                <h3 id={`picker-${group}`} className="mb-2 flex items-center gap-2 font-display text-base">
                  <span aria-hidden className={cn("h-2.5 w-2.5 rounded-full", REGION_DOT[muscleRegion(group)])} />
                  {muscleLabel(group)}
                </h3>
                <div className="divide-y divide-border overflow-hidden rounded-2xl bg-card shadow-soft dark:ring-1 dark:ring-white/5">
                  {items.map((exercise) => (
                    <button
                      key={exercise.id}
                      type="button"
                      onClick={() => handleSelect(exercise.id)}
                      className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{exercise.name}</span>
                        <span className="block text-xs capitalize text-muted-foreground">{exercise.category}</span>
                      </span>
                      <Plus className="h-4 w-4 shrink-0 text-primary" />
                    </button>
                  ))}
                </div>
              </section>
            ))}
            {groups.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No exercises match “{searchQuery}”. Try a shorter search, or add it from the exercise library.
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
