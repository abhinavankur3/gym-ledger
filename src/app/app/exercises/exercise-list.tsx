"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { createCustomExercise } from "./actions";
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
      toast.success("Exercise created!");
      setSheetOpen(false);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search exercises..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 rounded-xl bg-white/5 border-white/10"
        />
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border",
              category === cat
                ? "bg-primary text-primary-foreground border-transparent"
                : "border-white/10 text-muted-foreground hover:text-foreground"
            )}
          >
            {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Exercise Groups */}
      {grouped.map(([group, items]) => (
        <div key={group}>
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {group.replace("_", " ")}
            </h2>
            <Badge
              variant="outline"
              className={cn("text-[10px]", MUSCLE_GROUP_COLORS[group])}
            >
              {items.length}
            </Badge>
          </div>
          <div className="space-y-1">
            {items.map((exercise) => (
              <div
                key={exercise.id}
                className="flex items-center justify-between rounded-xl p-3 hover:bg-white/5 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium">{exercise.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">
                      {exercise.category}
                    </span>
                    {exercise.isCustom && (
                      <Badge
                        variant="outline"
                        className="text-[9px] border-primary/30 text-primary"
                      >
                        Custom
                      </Badge>
                    )}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] shrink-0",
                    MUSCLE_GROUP_COLORS[exercise.primaryMuscleGroup]
                  )}
                >
                  {exercise.primaryMuscleGroup.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No exercises found</p>
        </div>
      )}

      {/* Create Custom Exercise FAB */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger
          render={
            <button className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30" />
          }
        >
          <Plus className="h-6 w-6 text-primary-foreground" />
        </SheetTrigger>
        <SheetContent side="bottom" className="surface border-white/10 rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Create Custom Exercise</SheetTitle>
          </SheetHeader>
          <form action={handleCreateExercise} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Exercise Name</Label>
              <Input
                name="name"
                required
                className="h-11 rounded-xl bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select name="category" required>
                <SelectTrigger className="h-11 rounded-xl bg-white/5 border-white/10">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.filter((c) => c !== "all").map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Primary Muscle Group</Label>
              <Select name="primaryMuscleGroup" required>
                <SelectTrigger className="h-11 rounded-xl bg-white/5 border-white/10">
                  <SelectValue placeholder="Select muscle group" />
                </SelectTrigger>
                <SelectContent>
                  {MUSCLE_GROUPS.map((mg) => (
                    <SelectItem key={mg} value={mg}>
                      {mg.replace("_", " ").charAt(0).toUpperCase() +
                        mg.replace("_", " ").slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground rounded-xl"
            >
              Create Exercise
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
