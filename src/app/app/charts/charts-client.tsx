"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


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
import { Scale, Activity, CalendarCheck, Trophy } from "lucide-react";

type WeightEntry = { date: string; value: number; unit: string };
type AttendanceEntry = { date: string };
type VolumeEntry = { muscle: string; volume: number };
type ExerciseOption = { id: number; name: string };
type PREntry = { date: string; weight: number };

type Props = {
  weightData: WeightEntry[];
  attendanceData: AttendanceEntry[];
  volumeData: VolumeEntry[];
  exercises: ExerciseOption[];
  prData: Record<number, PREntry[]>;
};

const VOLUME_COLORS: Record<string, string> = {
  chest: "#fb7185",
  back: "#60a5fa",
  shoulders: "#fbbf24",
  biceps: "#a78bfa",
  triceps: "#a78bfa",
  quads: "#34d399",
  hamstrings: "#34d399",
  glutes: "#34d399",
  calves: "#34d399",
  core: "#fb923c",
  forearms: "#a78bfa",
  "full body": "#22d3ee",
};

export function ChartsClient({
  weightData,
  attendanceData,
  volumeData,
  exercises,
  prData,
}: Props) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<number>(
    exercises[0]?.id || 0
  );

  const prChartData = useMemo(() => {
    return (prData[selectedExerciseId] || []).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [selectedExerciseId, prData]);

  const selectedExerciseName = useMemo(
    () => exercises.find((e) => e.id === selectedExerciseId)?.name || "Select exercise",
    [selectedExerciseId, exercises]
  );

  // Attendance heatmap data
  const heatmapData = useMemo(() => {
    const dates = new Set(attendanceData.map((a) => a.date));
    const weeks: { date: string; attended: boolean }[][] = [];
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 364);

    let currentWeek: { date: string; attended: boolean }[] = [];
    const cursor = new Date(start);

    while (cursor <= today) {
      const dateStr = cursor.toISOString().split("T")[0];
      currentWeek.push({ date: dateStr, attended: dates.has(dateStr) });
      if (cursor.getDay() === 0 || cursor.getTime() === today.getTime()) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (currentWeek.length > 0) weeks.push(currentWeek);
    return weeks;
  }, [attendanceData]);

  return (
    <div className="mt-4 space-y-4">
      {/* Body Weight Chart */}
      <Card className="surface border-white/10 rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4 text-primary" />
            Body Weight
          </CardTitle>
        </CardHeader>
        <CardContent>
          {weightData.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                  tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                />
                <YAxis
                  domain={["dataMin - 2", "dataMax + 2"]}
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                />
                <Tooltip
                  contentStyle={{
                    background: "rgba(0,0,0,0.8)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="url(#gradientLine)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#d4a853" }}
                  activeDot={{ r: 5, fill: "#b8943e" }}
                />
                <defs>
                  <linearGradient id="gradientLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#d4a853" />
                    <stop offset="100%" stopColor="#b8943e" />
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              Log at least 2 weight entries to see the chart
            </div>
          )}
        </CardContent>
      </Card>

      {/* Volume by Muscle Group */}
      <Card className="surface border-white/10 rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-primary" />
            Training Volume (4 weeks)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {volumeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="muscle"
                  tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(0,0,0,0.8)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                  formatter={(value) => [`${(Number(value) / 1000).toFixed(1)}t`, "Volume"]}
                />
                <Bar
                  dataKey="volume"
                  radius={[6, 6, 0, 0]}
                  fill="url(#gradientBar)"
                />
                <defs>
                  <linearGradient id="gradientBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d4a853" />
                    <stop offset="100%" stopColor="#8a7339" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              Complete some workouts to see volume data
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Heatmap */}
      <Card className="surface border-white/10 rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarCheck className="h-4 w-4 text-emerald-400" />
            Attendance (52 weeks)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-0.5 overflow-x-auto no-scrollbar">
            {heatmapData.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((day) => (
                  <div
                    key={day.date}
                    title={day.date}
                    className={cn(
                      "h-3 w-3 rounded-sm transition-colors",
                      day.attended
                        ? "bg-emerald-500"
                        : "bg-white/5"
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="h-3 w-3 rounded-sm bg-white/5" />
            <div className="h-3 w-3 rounded-sm bg-emerald-500/40" />
            <div className="h-3 w-3 rounded-sm bg-emerald-500" />
            <span>More</span>
          </div>
        </CardContent>
      </Card>

      {/* PR Progression */}
      <Card className="surface border-white/10 rounded-2xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-amber-400" />
              PR Progression
            </CardTitle>
          </div>
          <select
            value={selectedExerciseId}
            onChange={(e) => setSelectedExerciseId(Number(e.target.value))}
            className="mt-2 h-9 w-full rounded-xl bg-white/5 border border-white/10 px-3 text-xs text-foreground outline-none"
          >
            {exercises.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </CardHeader>
        <CardContent>
          {prChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={prChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }}
                  tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                />
                <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.4)" }} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(0,0,0,0.8)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    fontSize: "12px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#fbbf24"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#fbbf24" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              No PR data for this exercise yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
