"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { startWorkout, startWorkoutFromTemplate } from "../actions";
import { getTemplates } from "../templates/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { Dumbbell, FileText } from "lucide-react";

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

type TemplateItem = {
  id: number;
  name: string;
  exerciseCount: number;
  muscleGroups: string[];
};

export default function NewWorkoutPage() {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateIdParam = searchParams.get("templateId");

  useEffect(() => {
    getTemplates().then(setTemplates);
  }, []);

  function handleStart() {
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await startWorkout(name.trim());
      if (result?.workoutId) {
        router.push(`/app/workouts/${result.workoutId}`);
      }
    });
  }

  function handleStartFromTemplate(templateId: number) {
    startTransition(async () => {
      const result = await startWorkoutFromTemplate(templateId);
      if (result && "workoutId" in result && result.workoutId) {
        router.push(`/app/workouts/${result.workoutId}`);
      }
    });
  }

  // If templateId is in URL, show confirmation view
  if (templateIdParam) {
    const templateId = Number(templateIdParam);
    const template = templates.find((t) => t.id === templateId);

    return (
      <div className="px-4 pt-8">
        <BlurFade delay={0}>
          <h1 className="text-2xl font-bold tracking-tight">Start Workout</h1>
        </BlurFade>

        <BlurFade delay={0.1}>
          <div className="mt-6 space-y-4">
            {template ? (
              <Card className="surface border-white/10 rounded-2xl">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <p className="font-semibold text-lg">{template.name}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {template.exerciseCount} exercise{template.exerciseCount !== 1 ? "s" : ""}
                  </p>
                  {template.muscleGroups.length > 0 && (
                    <div className="mt-2 flex gap-1.5 flex-wrap">
                      {template.muscleGroups.map((mg) => (
                        <Badge
                          key={mg}
                          variant="outline"
                          className="text-[9px] border-white/10"
                        >
                          {mg.replace("_", " ")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">Loading template...</p>
              </div>
            )}

            <Button
              onClick={() => handleStartFromTemplate(templateId)}
              disabled={pending}
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90"
            >
              <Dumbbell className="h-5 w-5 mr-2" />
              {pending
                ? "Starting..."
                : `Start ${template?.name ?? "Workout"}`}
            </Button>

            <button
              onClick={() => router.push("/app/workouts/new")}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Start without template instead
            </button>
          </div>
        </BlurFade>
      </div>
    );
  }

  return (
    <div className="px-4 pt-8">
      <BlurFade delay={0}>
        <h1 className="text-2xl font-bold tracking-tight">New Workout</h1>
      </BlurFade>

      {/* From Template Section */}
      {templates.length > 0 && (
        <BlurFade delay={0.05}>
          <div className="mt-6">
            <p className="text-xs text-muted-foreground mb-2">From template</p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleStartFromTemplate(t.id)}
                  disabled={pending}
                  className="flex-shrink-0 w-36"
                >
                  <Card className="surface border-white/10 rounded-2xl hover:bg-white/5 transition-colors h-full">
                    <CardContent className="p-3">
                      <FileText className="h-4 w-4 text-primary mb-1" />
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {t.exerciseCount} exercises
                      </p>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          </div>
        </BlurFade>
      )}

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
