import { requireUser } from "@/lib/auth/dal";
import { getWorkoutHistory } from "./actions";
import { WorkoutCard } from "./workout-card";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { EquipmentArt } from "@/components/equipment-art";

export default async function WorkoutsPage() {
  await requireUser();
  const workouts = await getWorkoutHistory();

  return (
    <main className="pb-6">
      <PageHeader
        title="Training log"
        subtitle={workouts.length > 0 ? `${workouts.length} session${workouts.length === 1 ? "" : "s"} logged` : undefined}
        action={
          <Link
            href="/app/workouts/new"
            aria-label="Start a new workout"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-glow"
          >
            <Plus className="h-5 w-5" />
          </Link>
        }
      />

      {workouts.length > 0 ? (
        <div className="space-y-3">
          {workouts.map((workout) => (
            <WorkoutCard key={workout.id} workout={workout} />
          ))}
        </div>
      ) : (
        <div className="relative mt-2 overflow-hidden rounded-[2rem] bg-sun p-6 pb-8 text-ink">
          <span aria-hidden className="pointer-events-none absolute -left-2 top-6 select-none whitespace-nowrap font-display text-[7rem] leading-none text-white/25">
            Start
          </span>
          <div className="relative">
            <p className="text-sm font-semibold text-ink/70">Nothing logged yet</p>
            <p className="mt-14 max-w-[14rem] font-display text-[2.2rem] leading-[0.95]">
              Your first session<span className="text-white">.</span>
            </p>
            <p className="mt-3 max-w-[15rem] text-sm text-ink/75">Log the sets you do today and they’ll show up here with volume and PRs.</p>
            <Link
              href="/app/workouts/new"
              className="mt-6 inline-flex h-12 items-center gap-2 rounded-2xl bg-ink px-5 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" /> Start a workout
            </Link>
          </div>
          <EquipmentArt kind="kettlebell" className="absolute -right-4 bottom-2 w-32 opacity-95" />
        </div>
      )}
    </main>
  );
}
