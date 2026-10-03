import { requireUser } from "@/lib/auth/dal";
import { getUserTimeZone } from "@/lib/dates";
import { ensureWeeklyReview, reviewHistory } from "@/lib/adaptive/weekly";
import { PageHeader } from "@/components/layout/page-header";
import { FactTable } from "@/components/fact-table";
import { ProposalCard } from "./proposal-card";

function weekLabel(weekStart: string) {
  return new Date(`${weekStart}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export default async function ReviewPage() {
  const user = await requireUser();
  await ensureWeeklyReview(user.id, await getUserTimeZone());
  const history = await reviewHistory(user.id);
  const latest = history[0];

  if (!latest) {
    return (
      <main className="pb-6">
        <PageHeader back={{ href: "/app", label: "Home" }} title="Weekly check-in" hideProfile />
        <div className="rounded-3xl bg-card p-6 shadow-soft dark:ring-1 dark:ring-white/5">
          <p className="font-display text-xl">Your first check-in is coming</p>
          <p className="mt-2 text-muted-foreground">After a full week on your plan, Kochi looks at what you actually did and suggests changes, each with a reason. Keep logging sets, meals and your weight.</p>
        </div>
      </main>
    );
  }

  const s = latest.summary;
  const pending = latest.proposals.filter((p) => p.status === "pending");
  const signed = (n: number) => `${n > 0 ? "+" : ""}${n}`;

  return (
    <main className="pb-6">
      <PageHeader back={{ href: "/app", label: "Home" }} title="Weekly check-in" subtitle={`Week of ${weekLabel(latest.weekStart)}`} hideProfile />

      <section aria-labelledby="week-heading" className="space-y-3">
        <h2 id="week-heading" className="sr-only">Last week</h2>
        <div className="grid grid-cols-3 gap-2.5">
          <Stat label="Sessions" value={`${s.completed}/${s.planned}`} detail={s.completionPct === null ? "planned" : `${s.completionPct}% of sets`} />
          <Stat label="Weight" value={s.weeklyChangeKg === null ? "—" : `${signed(s.weeklyChangeKg)}`} detail={s.weeklyChangeKg === null ? "need weigh-ins" : "kg a week"} />
          <Stat label="Meals" value={`${s.intakeDays}`} detail={s.avgKcal === null ? "days logged" : `days, ~${s.avgKcal} kcal`} />
        </div>
        {s.notes.length > 0 && (
          <ul className="space-y-2 rounded-3xl bg-ink p-5 text-white shadow-soft dark:bg-card dark:ring-1 dark:ring-white/5">
            {s.notes.map((note) => (
              <li key={note} className="flex gap-2.5 text-[0.95rem] leading-6"><span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sun" />{note}</li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="changes-heading" className="mt-8">
        <h2 id="changes-heading" className="font-display text-2xl">{pending.length ? "Suggested changes" : "Changes"}</h2>
        {latest.proposals.length === 0 ? (
          <p className="mt-2 text-muted-foreground">Nothing to change this week. Your plan is working, so keep going.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {latest.proposals.map((p) => <ProposalCard key={p.id} reviewId={latest.id} proposal={p} />)}
          </div>
        )}
      </section>

      {history.length > 1 && (
        <section aria-labelledby="history-heading" className="mt-10">
          <h2 id="history-heading" className="font-display text-2xl">Earlier check-ins</h2>
          <FactTable
            className="mt-3"
            rows={history.slice(1).map((r) => ({
              key: r.weekStart,
              label: (
                <span className="block">
                  <span className="block">Week of {weekLabel(r.weekStart)}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {r.proposals.length ? r.proposals.map((p) => `${p.title} (${p.status === "accepted" ? "accepted" : p.status === "declined" ? "not now" : "not decided"})`).join("; ") : "No changes suggested"}
                  </span>
                </span>
              ),
              value: `${r.summary.completed}/${r.summary.planned}`,
            }))}
          />
        </section>
      )}
    </main>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-3xl bg-card p-3.5 shadow-soft dark:ring-1 dark:ring-white/5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1.5 font-display tabular text-2xl leading-none">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{detail}</p>
    </div>
  );
}
