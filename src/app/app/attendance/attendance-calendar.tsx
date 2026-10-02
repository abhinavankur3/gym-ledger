"use client";

import { cn } from "@/lib/utils";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Props = {
  year: number;
  month: number;
  attendedDays: string[];
  activeCheckIn: boolean;
  /** YYYY-MM-DD in the user's time zone */
  today: string;
};

export function AttendanceCalendar({ year, month, attendedDays, activeCheckIn, today }: Props) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  // getDay() returns 0=Sun, we want 0=Mon
  const startOffset = (firstDay.getDay() + 6) % 7;
  const attendedSet = new Set(attendedDays);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <section aria-label={`${MONTH_NAMES[month - 1]} ${year}`} className="rounded-3xl bg-card p-5 shadow-soft dark:ring-1 dark:ring-white/5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl">{MONTH_NAMES[month - 1]}</h2>
        <span className="text-sm text-muted-foreground">{year}</span>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-1 text-xs font-medium text-muted-foreground">
            {d.slice(0, 1)}
            <span className="sr-only">{d.slice(1)}</span>
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isAttended = attendedSet.has(dateStr);
          const isToday = dateStr === today;
          const isTodayActive = isToday && activeCheckIn;

          return (
            <div
              key={day}
              aria-label={`${MONTH_NAMES[month - 1]} ${day}${isAttended ? ", checked in" : ""}${isToday ? ", today" : ""}`}
              className={cn(
                "tabular mx-auto flex h-10 w-10 items-center justify-center rounded-2xl text-sm transition-colors",
                isAttended && "bg-legs font-semibold text-ink",
                isTodayActive && "shadow-soft",
                isToday && "ring-2 ring-primary ring-offset-2 ring-offset-card",
                !isAttended && !isToday && "text-muted-foreground",
                !isAttended && isToday && "font-semibold text-foreground"
              )}
            >
              {day}
            </div>
          );
        })}
      </div>
    </section>
  );
}
