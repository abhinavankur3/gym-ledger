"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChevronDown, Trophy } from "lucide-react";

type WeightEntry = { date: string; value: number; unit: string };
type AttendanceEntry = { date: string };
type VolumeEntry = { muscle: string; volume: number };
type PRExercise = {
  exerciseId: number;
  exerciseName: string;
  bestWeight: number;
  bestDate: string;
  history: Array<{ date: string; weight: number }>;
};

type Props = {
  weightData: WeightEntry[];
  attendanceData: AttendanceEntry[];
  volumeData: VolumeEntry[];
  prExercises: PRExercise[];
  /** YYYY-MM-DD in the user's time zone */
  today: string;
};

// Recharts takes plain values; CSS variables keep charts in step with the theme.
const AXIS_TICK = { fontSize: 11, fill: "var(--muted-foreground)" };
const GRID_STROKE = "var(--border)";
const TOOLTIP_STYLE = {
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  border: "1px solid var(--border)",
  borderRadius: "16px",
  fontSize: "13px",
  boxShadow: "0 18px 36px -18px rgb(var(--shadow-color) / var(--shadow-strength))",
};
const TOOLTIP_LABEL = { color: "var(--muted-foreground)", marginBottom: 2 };

const shortDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function ChartsClient({
  weightData = [],
  attendanceData = [],
  volumeData = [],
  prExercises = [],
  today,
}: Props) {
  const [expandedPr, setExpandedPr] = useState<number | null>(null);

  // Attendance heatmap: 52 Monday-first week columns ending with the current week.
  // The first column is padded so every row lines up with the same weekday.
  const heatmapData = useMemo(() => {
    const dates = new Set(attendanceData.map((a) => a.date));
    const end = new Date(`${today}T00:00:00Z`);
    const endWeekday = (end.getUTCDay() + 6) % 7;
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - endWeekday - 51 * 7);

    const weeks: ({ date: string; attended: boolean } | null)[][] = [];
    const cursor = new Date(start);
    while (cursor.getTime() <= end.getTime()) {
      const week: ({ date: string; attended: boolean } | null)[] = [];
      for (let d = 0; d < 7; d++) {
        const dateStr = cursor.toISOString().split("T")[0];
        week.push(cursor.getTime() <= end.getTime() ? { date: dateStr, attended: dates.has(dateStr) } : null);
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  }, [attendanceData, today]);

  // Show the most recent weeks first on narrow screens.
  const heatmapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = heatmapRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [heatmapData]);

  // Summary for the colour block
  const monthPrefix = today.slice(0, 8);
  const visitDays = new Set(attendanceData.map((a) => a.date));
  const sessionsThisMonth = [...visitDays].filter((d) => d.startsWith(monthPrefix)).length;
  const latestWeight = weightData.at(-1);
  const firstWeight = weightData[0];
  const weightChange = latestWeight && firstWeight && weightData.length > 1 ? latestWeight.value - firstWeight.value : null;

  return (
    <div className="space-y-3">
      {/* Summary: the one bold element on this screen */}
      <section aria-label="This month" className="relative overflow-hidden rounded-[2rem] bg-pull p-6 text-ink">
        <span aria-hidden className="pointer-events-none absolute -right-2 -top-6 select-none font-display text-[9rem] leading-none text-white/25">
          {sessionsThisMonth}
        </span>
        <p className="relative text-sm font-semibold text-ink/70">This month</p>
        <p className="relative mt-6 flex items-baseline gap-2">
          <span className="font-display tabular text-6xl">{sessionsThisMonth}</span>
          <span className="text-lg font-semibold">gym {sessionsThisMonth === 1 ? "day" : "days"}</span>
        </p>
        <dl className="relative mt-5 grid grid-cols-3 gap-2">
          <SummaryStat label="12 months" value={String(visitDays.size)} />
          <SummaryStat label="Weight" value={latestWeight ? latestWeight.value.toFixed(1) : "—"} unit={latestWeight?.unit} />
          <SummaryStat label="Records" value={String(prExercises.length)} />
        </dl>
      </section>

      {/* Body weight */}
      <ChartCard
        title="Body weight"
        detail={
          weightChange !== null
            ? `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)} ${latestWeight?.unit ?? ""} over the last 6 months`
            : "Last 6 months"
        }
      >
        {weightData.length > 1 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weightData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={shortDate} minTickGap={24} />
              <YAxis domain={["dataMin - 2", "dataMax + 2"]} tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={TOOLTIP_LABEL}
                labelFormatter={(d) => shortDate(String(d))}
                formatter={(value) => [`${value} ${latestWeight?.unit ?? ""}`, "Weight"]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--chart-1)"
                strokeWidth={3}
                dot={{ r: 3, fill: "var(--chart-1)", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart>Log your weight on two different days to see the trend.</EmptyChart>
        )}
      </ChartCard>

      {/* Volume by muscle group */}
      <ChartCard title="Training volume" detail="Weight × reps per muscle group, last 4 weeks">
        {volumeData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={volumeData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
              <XAxis dataKey="muscle" tick={{ ...AXIS_TICK, fontSize: 10 }} tickLine={false} axisLine={false} angle={-40} textAnchor="end" height={56} interval={0} />
              <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => `${(Number(v) / 1000).toFixed(0)}t`} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelStyle={TOOLTIP_LABEL}
                cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                formatter={(value) => [`${(Number(value) / 1000).toFixed(1)} t`, "Volume"]}
              />
              <Bar dataKey="volume" radius={[10, 10, 4, 4]} fill="var(--pull)" maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChart>Finish a workout with weighted sets to see your volume.</EmptyChart>
        )}
      </ChartCard>

      {/* Attendance heatmap */}
      <ChartCard title="Attendance" detail="Last 52 weeks">
        <div ref={heatmapRef} className="flex gap-[3px] overflow-x-auto pb-1 no-scrollbar">
          {heatmapData.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day, di) =>
                day ? (
                  <div
                    key={day.date}
                    title={day.date}
                    className={cn("h-3 w-3 shrink-0 rounded-[4px]", day.attended ? "bg-legs" : "bg-muted")}
                  />
                ) : (
                  <div key={`pad-${di}`} className="h-3 w-3 shrink-0" />
                )
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[4px] bg-muted" /> No visit</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[4px] bg-legs" /> Checked in</span>
        </div>
      </ChartCard>

      {/* Personal records */}
      <ChartCard title="Personal records" detail={prExercises.length ? "Best weight per exercise. Tap one to see its history." : undefined}>
        {prExercises.length > 0 ? (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {prExercises.map((pr) => {
              const open = expandedPr === pr.exerciseId;
              return (
                <li key={pr.exerciseId}>
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setExpandedPr(open ? null : pr.exerciseId)}
                    className={cn("grid w-full grid-cols-[1fr_8rem] items-stretch text-left transition-colors hover:bg-muted/50", open && "bg-muted/50")}
                  >
                    <span className="flex min-w-0 items-center gap-3 px-4 py-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sun/25 text-ink dark:text-sun">
                        <Trophy className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{pr.exerciseName}</span>
                        <span className="block text-xs text-muted-foreground">{shortDate(pr.bestDate)}</span>
                      </span>
                    </span>
                    <span className="flex items-center justify-end gap-2 border-l border-border px-4">
                      <span className="flex items-baseline gap-0.5">
                        <span className="font-display tabular text-2xl">{pr.bestWeight}</span>
                        <span className="text-xs text-muted-foreground">kg</span>
                      </span>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
                    </span>
                  </button>

                  {open && (
                    <div className="border-t border-border px-2 py-3">
                      {pr.history.length > 1 ? (
                        <ResponsiveContainer width="100%" height={150}>
                          <LineChart data={pr.history} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                            <XAxis dataKey="date" tick={{ ...AXIS_TICK, fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={shortDate} minTickGap={20} />
                            <YAxis tick={{ ...AXIS_TICK, fontSize: 10 }} tickLine={false} axisLine={false} domain={["dataMin - 5", "dataMax + 5"]} width={40} />
                            <Tooltip
                              contentStyle={TOOLTIP_STYLE}
                              labelStyle={TOOLTIP_LABEL}
                              labelFormatter={(d) => shortDate(String(d))}
                              formatter={(value) => [`${value} kg`, "Record"]}
                            />
                            <Line type="monotone" dataKey="weight" stroke="var(--sun)" strokeWidth={3} dot={{ r: 3, fill: "var(--sun)", strokeWidth: 0 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="px-2 text-sm text-muted-foreground">One record so far. Beat it to start a history.</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyChart>Log sets in a workout. Your heaviest set for each exercise shows up here.</EmptyChart>
        )}
      </ChartCard>
    </div>
  );
}

function SummaryStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-2xl bg-white/35 px-3 py-2.5">
      <dt className="text-xs font-semibold text-ink/70">{label}</dt>
      <dd className="mt-0.5 flex items-baseline gap-0.5">
        <span className="font-display tabular text-xl">{value}</span>
        {unit && <span className="text-xs font-semibold text-ink/70">{unit}</span>}
      </dd>
    </div>
  );
}

function ChartCard({ title, detail, children }: { title: string; detail?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-card p-5 shadow-soft dark:ring-1 dark:ring-white/5">
      <h2 className="font-display text-xl">{title}</h2>
      {detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyChart({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-border px-6 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
