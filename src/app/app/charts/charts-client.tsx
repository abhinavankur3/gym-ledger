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
import { Scale, Activity, CalendarCheck, Trophy, ChevronRight } from "lucide-react";

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
};

export function ChartsClient({
  weightData = [],
  attendanceData = [],
  volumeData = [],
  prExercises = [],
}: Props) {
  const [expandedPr, setExpandedPr] = useState<number | null>(null);

  // Attendance heatmap data
  const heatmapData = useMemo(() => {
    const dates = new Set(attendanceData.map((a) => a.date));
    const weeks: { date: string; attended: boolean }[][] = [];
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 364);

    let currentWeek: { date: string; attended: boolean }[] = [];
    const cursor = new Date(start);

    while (cursor.getTime() <= today.getTime()) {
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
                      day.attended ? "bg-emerald-500" : "bg-white/5"
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

      {/* Personal Records */}
      <Card className="surface border-white/10 rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-amber-400" />
            Personal Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {prExercises.length > 0 ? (
            <div className="space-y-2">
              {prExercises.map((pr) => (
                <div key={pr.exerciseId}>
                  <button
                    onClick={() =>
                      setExpandedPr(
                        expandedPr === pr.exerciseId ? null : pr.exerciseId
                      )
                    }
                    className={cn(
                      "w-full flex items-center justify-between rounded-xl p-3 transition-colors text-left",
                      expandedPr === pr.exerciseId
                        ? "bg-primary/10"
                        : "hover:bg-white/5"
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium">{pr.exerciseName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(pr.bestDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-primary">
                        {pr.bestWeight}
                        <span className="text-xs font-normal text-muted-foreground ml-0.5">
                          kg
                        </span>
                      </span>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          expandedPr === pr.exerciseId && "rotate-90"
                        )}
                      />
                    </div>
                  </button>

                  {expandedPr === pr.exerciseId && pr.history.length > 1 && (
                    <div className="mt-2 px-1 pb-2">
                      <ResponsiveContainer width="100%" height={150}>
                        <LineChart data={pr.history}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.05)"
                          />
                          <XAxis
                            dataKey="date"
                            tick={{
                              fontSize: 9,
                              fill: "rgba(255,255,255,0.4)",
                            }}
                            tickFormatter={(d) =>
                              new Date(d).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })
                            }
                          />
                          <YAxis
                            tick={{
                              fontSize: 9,
                              fill: "rgba(255,255,255,0.4)",
                            }}
                            domain={["dataMin - 5", "dataMax + 5"]}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "rgba(0,0,0,0.8)",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: "12px",
                              fontSize: "12px",
                            }}
                            formatter={(value) => [`${value} kg`, "PR"]}
                          />
                          <Line
                            type="monotone"
                            dataKey="weight"
                            stroke="#fbbf24"
                            strokeWidth={2}
                            dot={{ r: 3, fill: "#fbbf24" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
              Log some sets to see your PRs
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
