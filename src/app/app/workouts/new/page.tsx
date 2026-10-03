"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { startWorkout, startWorkoutFromTemplate } from "../actions";
import { getTemplates } from "../templates/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { SessionHero } from "@/components/session-hero";
import { MuscleChip } from "@/components/muscle-chip";
import { TONE_BG, sessionTone, type SessionTone } from "@/lib/muscles";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

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

const TONE_ART = { push: "dumbbell", pull: "kettlebell", legs: "plate", sun: "kettlebell" } as const;

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
      if ("workoutId" in result) router.push(`/app/workouts/${result.workoutId}`);
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
    const tone: SessionTone = template ? sessionTone(template.muscleGroups) : "sun";

    return (
      <main className="pb-6">
        <PageHeader title="Start workout" back={{ href: "/app/workouts", label: "Training log" }} />

        {template ? (
          <>
            <SessionHero
              tone={tone}
              kicker="Ready when you are"
              title={template.name}
              art={TONE_ART[tone]}
              meta={`${template.exerciseCount} exercise${template.exerciseCount !== 1 ? "s" : ""}`}
            />
            {template.muscleGroups.length > 0 && (
              <div className="mt-16 flex flex-wrap gap-1.5">
                {template.muscleGroups.map((mg) => (
                  <MuscleChip key={mg} muscle={mg} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-60 items-center justify-center rounded-[2rem] bg-muted text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading session…
          </div>
        )}

        <div className={cn("space-y-2", template && template.muscleGroups.length > 0 ? "mt-6" : "mt-16")}>
          <Button
            onClick={() => handleStartFromTemplate(templateId)}
            disabled={pending}
            size="lg"
            className="w-full"
          >
            {pending ? <><Loader2 className="h-5 w-5 animate-spin" /> Starting…</> : `Start ${template?.name ?? "workout"}`}
          </Button>

          <button
            type="button"
            onClick={() => router.push("/app/workouts/new")}
            className="h-11 w-full rounded-2xl text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Start an empty workout instead
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="pb-6">
      <PageHeader title="New workout" back={{ href: "/app/workouts", label: "Training log" }} />

      {templates.length > 0 && (
        <section aria-labelledby="from-plan" className="mb-8">
          <h2 id="from-plan" className="font-display text-xl">From your plan</h2>
          <div className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
            {templates.map((t) => {
              const tone = sessionTone(t.muscleGroups);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleStartFromTemplate(t.id)}
                  disabled={pending}
                  className={cn(
                    "relative flex h-36 w-40 shrink-0 flex-col justify-between overflow-hidden rounded-3xl p-4 text-left text-ink shadow-soft transition-transform active:scale-[0.98] disabled:opacity-60",
                    TONE_BG[tone]
                  )}
                >
                  <span aria-hidden className="pointer-events-none absolute -left-1 top-8 select-none whitespace-nowrap font-display text-[4.5rem] leading-none text-white/25">
                    {t.name}
                  </span>
                  <span className="relative text-sm font-semibold text-ink/70">
                    {t.exerciseCount} exercise{t.exerciseCount !== 1 ? "s" : ""}
                  </span>
                  <span className="relative line-clamp-2 font-display text-xl leading-tight">{t.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section aria-labelledby="custom-workout" className="rounded-3xl bg-card p-5 shadow-soft dark:ring-1 dark:ring-white/5">
        <h2 id="custom-workout" className="font-display text-xl">{templates.length > 0 ? "Or name your own" : "Name your session"}</h2>
        <div className="mt-4 space-y-2">
          <Label htmlFor="workout-name">Workout name</Label>
          <Input
            id="workout-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleStart()}
            placeholder="e.g. Push Day"
            autoFocus={templates.length === 0}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Quick names">
          {QUICK_NAMES.map((qn) => (
            <button
              key={qn}
              type="button"
              onClick={() => setName(qn)}
              aria-pressed={name === qn}
              className={cn(
                "h-10 rounded-full px-4 text-sm font-medium transition-colors",
                name === qn ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {qn}
            </button>
          ))}
        </div>
      </section>

      <Button onClick={handleStart} disabled={pending || !name.trim()} size="lg" className="mt-5 w-full">
        {pending ? <><Loader2 className="h-5 w-5 animate-spin" /> Starting…</> : name.trim() ? `Start ${name.trim()}` : "Start workout"}
      </Button>
    </main>
  );
}
