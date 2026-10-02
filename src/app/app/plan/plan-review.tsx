"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FactTable } from "@/components/fact-table";
import { cn } from "@/lib/utils";
import { TONE_BG, type SessionTone } from "@/lib/muscles";
import { regeneratePlan, confirmPlan } from "./actions";
import { WEEKDAY_LABELS, trainingWeekdays, type Plan } from "@/lib/ai/plan-types";

const FEEDBACK_LIMIT = 600;
const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Plan days only carry exercise names, so the session colour comes from the day's name. */
function dayTone(name: string): SessionTone {
  const n = name.toLowerCase();
  if (/push|upper|chest|shoulder/.test(n)) return "push";
  if (/pull|back/.test(n)) return "pull";
  if (/lower|leg|squat|glute/.test(n)) return "legs";
  return "sun";
}

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

  return <div className="space-y-6">
    <p className="text-muted-foreground">
      {plan.days.length} training days a week.{restDays.length > 0 && <> Rest on {restDays.join(", ")}.</>}
    </p>

    <div className="relative" aria-busy={regenerating}>
      <div className={cn("grid gap-4 sm:grid-cols-2 transition-opacity", regenerating && "pointer-events-none opacity-30")}>
        {plan.days.map((day, index) => {
          const tone = dayTone(day.name);
          return (
            <article key={`${day.name}-${index}`} className="overflow-hidden rounded-3xl bg-card shadow-soft dark:ring-1 dark:ring-white/5">
              <div className={cn("relative h-32 overflow-hidden p-5 text-ink", TONE_BG[tone])}>
                <span aria-hidden className="pointer-events-none absolute -left-1 top-8 select-none whitespace-nowrap font-display text-[5.5rem] leading-none text-white/25">{day.name}</span>
                <p className="relative text-sm font-semibold text-ink/70">{WEEKDAY_NAMES[weekdays[index]]}</p>
                <h2 className="relative mt-6 font-display text-3xl">{day.name}<span className="text-white">.</span></h2>
              </div>
              <div className="p-3">
                <FactTable
                  className="border-0"
                  rows={day.exercises.map((exercise, exerciseIndex) => ({
                    key: `${exercise.exercise}-${exerciseIndex}`,
                    label: exercise.exercise,
                    value: `${exercise.sets} × ${exercise.reps}`,
                  }))}
                />
              </div>
            </article>
          );
        })}
      </div>
      {regenerating && <div role="status" className="absolute inset-0 flex items-start justify-center pt-16">
        <div className="flex max-w-xs flex-col items-center gap-3 rounded-3xl bg-card px-8 py-7 text-center shadow-lift">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="font-display text-xl">Generating a new version</p>
          <p className="text-sm text-muted-foreground">This can take up to a minute.</p>
        </div>
      </div>}
    </div>

    <section className="rounded-3xl bg-card p-5 shadow-soft dark:ring-1 dark:ring-white/5">
      <label htmlFor="plan-feedback" className="font-display text-xl">Want a change?</label>
      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">Mention practical preferences like exercises you dislike, equipment you have, or a movement that needs replacing.</p>
      <textarea id="plan-feedback" value={feedback} onChange={(event) => setFeedback(event.target.value.slice(0, FEEDBACK_LIMIT))} maxLength={FEEDBACK_LIMIT} disabled={pending} aria-describedby="plan-feedback-count" placeholder="e.g. Replace barbell squats because my knee feels uncomfortable." className="mt-4 min-h-28 w-full resize-y rounded-2xl border border-input bg-raised p-4 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60" />
      <p id="plan-feedback-count" className={cn("tabular mt-1.5 text-right text-xs text-muted-foreground", feedback.length >= FEEDBACK_LIMIT && "text-destructive")}>{feedback.length}/{FEEDBACK_LIMIT}</p>
      {error && <p role="alert" className="mt-3 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Button type="button" variant="outline" size="lg" onClick={regenerate} disabled={pending}>{regenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}{regenerating ? "Generating…" : "Regenerate plan"}</Button>
        <Button type="button" size="lg" onClick={confirm} disabled={pending}>{pending && busy === "confirm" ? <><Loader2 className="h-5 w-5 animate-spin" />Saving plan…</> : <><Check className="h-5 w-5" />Use this plan</>}</Button>
      </div>
    </section>
  </div>;
}
