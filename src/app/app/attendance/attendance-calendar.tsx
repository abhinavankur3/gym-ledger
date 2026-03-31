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
};

export function AttendanceCalendar({ year, month, attendedDays, activeCheckIn }: Props) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  // getDay() returns 0=Sun, we want 0=Mon
  const startOffset = (firstDay.getDay() + 6) % 7;
  const today = new Date().toISOString().split("T")[0];
  const attendedSet = new Set(attendedDays);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="surface rounded-2xl p-4 border border-white/10">
      <p className="text-center font-semibold mb-3">
        {MONTH_NAMES[month - 1]} {year}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-[10px] text-muted-foreground font-medium py-1">
            {d}
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
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-xl text-sm mx-auto transition-colors",
                isAttended && !isTodayActive && "bg-primary/20 text-primary font-semibold",
                isTodayActive && "bg-primary text-primary-foreground font-semibold",
                isToday && !isAttended && "ring-1 ring-primary/50",
                !isAttended && !isToday && "text-muted-foreground"
              )}
            >
              {day}
              {isAttended && !isTodayActive && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
