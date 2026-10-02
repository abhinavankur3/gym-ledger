import Link from "next/link";
import { requireUser } from "@/lib/auth/dal";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { sessionTone } from "@/lib/muscles";
import { WEEKDAY_LABELS } from "@/lib/ai/plan-types";
import { getActivePlan, getPlanDraft } from "./actions";
import { PlanReview } from "./plan-review";
import { PlanDayCard } from "./plan-day-card";
import { ChangePlan } from "./change-plan";

const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default async function PlanPage() {
  await requireUser();
  const [draft, active] = await Promise.all([getPlanDraft(), getActivePlan()]);

  // A pending draft always takes over: review it before anything else.
  if (draft) {
    return (
      <main className="pb-12">
        <PageHeader
          back={{ href: "/app", label: "Home" }}
          title={active ? "Your new plan" : "Your plan"}
          subtitle={active ? "Your current plan stays in place until you confirm this one." : "Confirm it when it feels right, or tell Kochi what to change."}
        />
        <PlanReview plan={draft.plan} feedback={draft.feedback} />
      </main>
    );
  }

  if (!active) {
    return (
      <main className="pb-12">
        <PageHeader back={{ href: "/app", label: "Home" }} title="Your plan" />
        <div className="rounded-3xl bg-card p-6 shadow-soft dark:ring-1 dark:ring-white/5">
          <p className="font-display text-xl">No plan yet</p>
          <p className="mt-2 text-muted-foreground">Answer a few questions and Kochi will build your training week.</p>
          <Link href="/onboarding" className="mt-5 block"><Button size="lg" className="w-full">Build my plan</Button></Link>
        </div>
      </main>
    );
  }

  const trainingDays = new Set(active.days.map((d) => d.dayOfWeek));
  const restDays = WEEKDAY_LABELS.filter((_, i) => !trainingDays.has(i));

  return (
    <main className="pb-12">
      <PageHeader
        back={{ href: "/app", label: "Home" }}
        title="Your plan"
        subtitle={`${active.name}. ${active.days.length} sessions a week${restDays.length ? `, rest on ${restDays.join(", ")}` : ""}.`}
      />
      <h2 className="sr-only">Workout sessions</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {active.days.map((day) => (
          <PlanDayCard
            key={day.dayOfWeek}
            weekday={WEEKDAY_NAMES[day.dayOfWeek]}
            name={day.name}
            tone={sessionTone(day.exercises.map((e) => e.muscle))}
            rows={day.exercises.map((e, i) => ({ key: `${e.name}-${i}`, label: e.name, value: e.sets ? `${e.sets} × ${e.reps ?? "—"}` : "—" }))}
          />
        ))}
      </div>
      <div className="mt-6">
        <ChangePlan />
      </div>
    </main>
  );
}
