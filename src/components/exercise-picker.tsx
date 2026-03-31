"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="surface border-white/10 rounded-t-2xl h-[70vh]"
      >
        <SheetHeader>
          <SheetTitle>Add Exercise</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search exercises..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-white/5 border-white/10"
              autoFocus
            />
          </div>
          <div className="overflow-y-auto max-h-[calc(70vh-10rem)] space-y-3">
            {Object.entries(groupedFiltered)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([group, items]) => (
                <div key={group}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    {group.replace("_", " ")}
                  </p>
                  {items.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => handleSelect(exercise.id)}
                      className="w-full text-left rounded-xl p-3 hover:bg-white/5 transition-colors flex items-center justify-between"
                    >
                      <span className="text-sm font-medium">
                        {exercise.name}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px]",
                          MUSCLE_GROUP_COLORS[exercise.primaryMuscleGroup]
                        )}
                      >
                        {exercise.category}
                      </Badge>
                    </button>
                  ))}
                </div>
              ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
