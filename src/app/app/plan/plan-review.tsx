"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Dumbbell, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { regeneratePlan, confirmPlan } from "./actions";
import { WEEKDAY_LABELS, trainingWeekdays, type Plan } from "@/lib/ai/plan-types";

const FEEDBACK_LIMIT = 600;

export function PlanReview({ plan, feedback: initialFeedback }: { plan: Plan; feedback: string }) {
  const [feedback, setFeedback] = useState(initialFeedback);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"regenerate" | "confirm" | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const weekdays = trainingWeekdays(plan.days.length);
  const restDays = WEEKDAY_LABELS.filter((_, index) => !weekdays.includes(index));
  const regenerating = pending && busy === "regenerate";

  function regenerate() {
    setError("");
    setBusy("regenerate");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("feedback", feedback);
      const result = await regeneratePlan(formData);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  function confirm() {
    setError("");
    setBusy("confirm");
    startTransition(async () => {
      await confirmPlan();
    });
  }

  return <div className="mt-8 space-y-5">
    <p className="text-sm text-muted-foreground">
      {plan.days.length} training days{restDays.length > 0 && <> · Rest on {restDays.join(", ")}</>}
    </p>
    <div className="relative" aria-busy={regenerating}>
      <div className={cn("grid gap-3 sm:grid-cols-2 transition-opacity", regenerating && "pointer-events-none opacity-30")}>
        {plan.days.map((day, index) => <Card key={`${day.name}-${index}`} className="rounded-3xl border-border bg-card">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{WEEKDAY_LABELS[weekdays[index]]}</p><h2 className="mt-1 text-lg font-bold">{day.name}</h2></div><Dumbbell className="h-5 w-5 text-muted-foreground" /></div>
            <ul className="mt-4 space-y-2">{day.exercises.map((exercise, exerciseIndex) => <li key={`${exercise.exercise}-${exerciseIndex}`} className="flex items-center justify-between gap-3 text-sm"><span className="truncate">{exercise.exercise}</span><span className="shrink-0 text-xs text-muted-foreground">{exercise.sets} × {exercise.reps}</span></li>)}</ul>
          </CardContent>
        </Card>)}
      </div>
      {regenerating && <div role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="font-bold">Generating a new version…</p>
        <p className="max-w-xs text-xs text-muted-foreground">This can take up to a minute.</p>
      </div>}
    </div>
    <Card className="rounded-3xl border-primary/20 bg-primary/5"><CardContent className="p-5">
      <label htmlFor="plan-feedback" className="text-sm font-bold">Want a change?</label>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Mention practical preferences like exercises you dislike, equipment you have, or a movement that needs replacing.</p>
      <textarea id="plan-feedback" value={feedback} onChange={(event) => setFeedback(event.target.value.slice(0, FEEDBACK_LIMIT))} maxLength={FEEDBACK_LIMIT} disabled={pending} aria-describedby="plan-feedback-count" placeholder="e.g. Replace barbell squats because my knee feels uncomfortable." className="mt-4 min-h-24 w-full resize-y rounded-2xl border border-border bg-background p-3 text-sm outline-none ring-primary/30 placeholder:text-muted-foreground focus:ring-2 disabled:opacity-60" />
      <p id="plan-feedback-count" className={cn("mt-1 text-right text-xs text-muted-foreground", feedback.length >= FEEDBACK_LIMIT && "text-destructive")}>{feedback.length}/{FEEDBACK_LIMIT}</p>
      {error && <p role="alert" className="mt-2 text-sm font-medium text-destructive">{error}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={regenerate} disabled={pending} className="h-12 rounded-2xl font-bold">{regenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}{regenerating ? "Generating…" : "Regenerate plan"}</Button>
        <Button type="button" onClick={confirm} disabled={pending} className="h-12 rounded-2xl font-bold">{pending && busy === "confirm" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving plan…</> : <><Check className="mr-2 h-4 w-4" />Use this plan</>}</Button>
      </div>
    </CardContent></Card>
  </div>;
}
