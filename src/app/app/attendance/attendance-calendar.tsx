"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DayDialog } from "./day-dialog";

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
  /** Earliest day that can be opened to backdate (YYYY-MM-DD) */
  earliest: string;
  prevHref: string | null;
  nextHref: string | null;
};

export function AttendanceCalendar({ year, month, attendedDays, activeCheckIn, today, earliest, prevHref, nextHref }: Props) {
  const [openDay, setOpenDay] = useState<string | null>(null);
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
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">{MONTH_NAMES[month - 1]} <span className="font-sans text-sm font-normal text-muted-foreground">{year}</span></h2>
        <div className="flex gap-1">
          {prevHref ? (
            <Link href={prevHref} aria-label="Previous month" className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted"><ChevronLeft className="h-5 w-5" /></Link>
          ) : <span className="h-10 w-10" aria-hidden />}
          {nextHref ? (
            <Link href={nextHref} aria-label="Next month" className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted"><ChevronRight className="h-5 w-5" /></Link>
          ) : <span className="h-10 w-10" aria-hidden />}
        </div>
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

          const openable = dateStr >= earliest && dateStr <= today;
          const label = `${MONTH_NAMES[month - 1]} ${day}${isAttended ? ", checked in" : ""}${isToday ? ", today" : ""}`;
          const classes = cn(
            "tabular mx-auto flex h-10 w-10 items-center justify-center rounded-2xl text-sm transition-colors",
            isAttended && "bg-legs font-semibold text-ink",
            isTodayActive && "shadow-soft",
            isToday && "ring-2 ring-primary ring-offset-2 ring-offset-card",
            !isAttended && !isToday && (openable ? "text-foreground/80" : "text-muted-foreground/60"),
            !isAttended && isToday && "font-semibold text-foreground",
            openable && "hover:ring-2 hover:ring-primary/40"
          );

          return openable ? (
            <button key={day} type="button" onClick={() => setOpenDay(dateStr)} aria-label={`${label}. Open to log this day`} className={classes}>
              {day}
            </button>
          ) : (
            <div key={day} aria-label={label} className={classes}>
              {day}
            </div>
          );
        })}
      </div>
      <DayDialog date={openDay} onClose={() => setOpenDay(null)} />
    </section>
  );
}
