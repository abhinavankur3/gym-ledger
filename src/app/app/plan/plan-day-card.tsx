import { cn } from "@/lib/utils";
import { FactTable, type Fact } from "@/components/fact-table";
import { TONE_BG, type SessionTone } from "@/lib/muscles";

/** Plan drafts only carry exercise names, so their colour comes from the day's name. */
export function dayTone(name: string): SessionTone {
  const n = name.toLowerCase();
  if (/push|upper|chest|shoulder/.test(n)) return "push";
  if (/pull|back/.test(n)) return "pull";
  if (/lower|leg|squat|glute/.test(n)) return "legs";
  return "sun";
}

/** One training day: tone block with weekday + session name, then exercise | sets × reps rows. */
export function PlanDayCard({ weekday, name, tone, rows, footer }: { weekday: string; name: string; tone: SessionTone; rows: Fact[]; footer?: React.ReactNode }) {
  return (
    <article className="overflow-hidden rounded-3xl bg-card shadow-soft dark:ring-1 dark:ring-white/5">
      <div className={cn("relative h-32 overflow-hidden p-5 text-ink", TONE_BG[tone])}>
        <span aria-hidden className="pointer-events-none absolute -left-1 top-8 select-none whitespace-nowrap font-display text-[5.5rem] leading-none text-white/25">{name}</span>
        <p className="relative text-sm font-semibold text-ink/70">{weekday}</p>
        <h2 className="relative mt-6 font-display text-3xl">{name}<span className="text-white">.</span></h2>
      </div>
      <div className="p-3">
        <FactTable className="border-0" rows={rows} />
        {footer}
      </div>
    </article>
  );
}
