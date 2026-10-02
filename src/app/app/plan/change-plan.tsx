"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, RefreshCw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { regeneratePlan } from "./actions";

const FEEDBACK_LIMIT = 600;

/** Ask Kochi for a new draft of an active plan. The current plan stays until the draft is confirmed. */
export function ChangePlan() {
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function draft() {
    setError("");
    startTransition(async () => {
      const formData = new FormData();
      formData.set("feedback", feedback);
      const result = await regeneratePlan(formData);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <section aria-labelledby="change-plan-heading" className="rounded-3xl bg-card p-5 shadow-soft dark:ring-1 dark:ring-white/5">
      <h2 id="change-plan-heading" className="font-display text-xl">Change my plan</h2>
      <p className="mt-1 text-sm text-muted-foreground">Tell Kochi what isn’t working. You’ll review the new version before it replaces this one.</p>
      <label htmlFor="change-feedback" className="sr-only">What should change?</label>
      <textarea
        id="change-feedback"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value.slice(0, FEEDBACK_LIMIT))}
        maxLength={FEEDBACK_LIMIT}
        disabled={pending}
        placeholder="e.g. Shorter sessions on weekdays, and swap squats for leg press."
        className="mt-4 min-h-24 w-full resize-y rounded-2xl border border-input bg-card p-4 text-base outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      />
      <p className={cn("mt-1 text-right text-xs text-muted-foreground", feedback.length >= FEEDBACK_LIMIT && "text-destructive")}>{feedback.length}/{FEEDBACK_LIMIT}</p>
      {error && <p role="alert" className="mt-2 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Button onClick={draft} disabled={pending} size="lg">
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
          {pending ? "Drafting…" : "Draft a new plan"}
        </Button>
        <Link href="/onboarding" className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-6 text-base font-semibold shadow-soft hover:bg-muted">
          <SlidersHorizontal className="h-5 w-5" /> Update my answers
        </Link>
      </div>
    </section>
  );
}
