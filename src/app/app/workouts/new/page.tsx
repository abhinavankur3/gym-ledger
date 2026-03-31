"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startWorkout } from "../actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BlurFade } from "@/components/ui/blur-fade";
import { Dumbbell } from "lucide-react";

const QUICK_NAMES = [
  "Push Day",
  "Pull Day",
  "Leg Day",
  "Upper Body",
  "Lower Body",
  "Full Body",
  "Chest & Triceps",
  "Back & Biceps",
  "Shoulders & Arms",
  "Cardio",
];

export default function NewWorkoutPage() {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleStart() {
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await startWorkout(name.trim());
      if (result?.workoutId) {
        router.push(`/app/workouts/${result.workoutId}`);
      }
    });
  }

  return (
    <div className="px-4 pt-8">
      <BlurFade delay={0}>
        <h1 className="text-2xl font-bold tracking-tight">New Workout</h1>
      </BlurFade>

      <BlurFade delay={0.1}>
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>Workout Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Push Day"
              className="h-12 rounded-xl bg-white/5 border-white/10"
              autoFocus
            />
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Quick select</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_NAMES.map((qn) => (
                <button
                  key={qn}
                  onClick={() => setName(qn)}
                  className="rounded-full px-3 py-1.5 text-xs font-medium border border-white/10 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                >
                  {qn}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleStart}
            disabled={pending || !name.trim()}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 mt-4"
          >
            <Dumbbell className="h-5 w-5 mr-2" />
            {pending ? "Starting..." : "Start Workout"}
          </Button>
        </div>
      </BlurFade>
    </div>
  );
}
