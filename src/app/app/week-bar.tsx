import { cn } from "@/lib/utils";
import { WEEKDAY_LABELS } from "@/lib/ai/plan-types";

type SlotState = "done" | "planned" | "missed" | "rest";

type Props = {
  /** Weekdays (0 = Monday) with at least one logged workout */
  doneDays: number[];
  /** Weekdays the active routine schedules */
  plannedDays: number[];
  today: number;
};

/**
 * The week as a loaded barbell: each logged session is a plate on the bar,
 * planned sessions are empty plate outlines, rest days are bare bar.
 */
export function WeekBar({ doneDays, plannedDays, today }: Props) {
  const slots = WEEKDAY_LABELS.map((label, day) => {
    const state: SlotState = doneDays.includes(day)
      ? "done"
      : plannedDays.includes(day)
        ? day < today
          ? "missed"
          : "planned"
        : "rest";
    return { label, day, state };
  });

  const planned = plannedDays.length;
  const doneOfPlanned = plannedDays.filter((d) => doneDays.includes(d)).length;
  const extra = doneDays.filter((d) => !plannedDays.includes(d)).length;
  const summary = planned
    ? `${doneOfPlanned} of ${planned} planned sessions done${extra ? `, plus ${extra} extra` : ""}`
    : `${doneDays.length} session${doneDays.length === 1 ? "" : "s"} logged`;

  let loadIndex = 0;
  return (
    <figure>
      <div role="img" aria-label={`This week: ${summary}`} className="relative h-24">
        {/* the bar and its sleeves */}
        <div aria-hidden className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted" />
        <div aria-hidden className="absolute left-0 top-1/2 h-4 w-1.5 -translate-y-1/2 rounded-sm bg-muted-foreground/40" />
        <div aria-hidden className="absolute right-0 top-1/2 h-4 w-1.5 -translate-y-1/2 rounded-sm bg-muted-foreground/40" />
        <div aria-hidden className="relative flex h-full items-center justify-around px-3">
          {slots.map((slot) => (
            <div key={slot.day} className="flex w-8 items-center justify-center">
              {slot.state === "done" && (
                <span
                  className="animate-plate-load block h-[4.5rem] w-6 rounded-[5px] bg-primary shadow-[inset_-3px_0_0_rgb(0_0_0/0.18)]"
                  style={{ animationDelay: `${120 + loadIndex++ * 90}ms` }}
                />
              )}
              {slot.state === "planned" && (
                <span className={cn("block h-14 w-5 rounded-[5px] border-2 border-dashed bg-background", slot.day === today ? "border-ring" : "border-muted-foreground/35")} />
              )}
              {slot.state === "missed" && <span className="block h-14 w-5 rounded-[5px] bg-muted" />}
              {slot.state === "rest" && <span className="block h-3 w-3 rounded-full bg-muted" />}
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden className="flex justify-around px-3">
        {slots.map((slot) => (
          <span key={slot.day} className={cn("w-8 text-center text-xs", slot.day === today ? "font-bold text-foreground" : "text-muted-foreground")}>
            {slot.label.slice(0, 1)}
          </span>
        ))}
      </div>
      <figcaption className="mt-4 text-sm text-muted-foreground">{summary}</figcaption>
    </figure>
  );
}
