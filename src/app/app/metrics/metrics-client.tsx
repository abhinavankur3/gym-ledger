"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { addMetric, deleteMetric } from "./actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { toast } from "sonner";

const METRIC_TYPES = [
  { value: "weight", label: "Weight", units: ["kg", "lbs"] },
  { value: "body_fat", label: "Body Fat %", units: ["%"] },
  { value: "chest", label: "Chest", units: ["cm", "in"] },
  { value: "waist", label: "Waist", units: ["cm", "in"] },
  { value: "hips", label: "Hips", units: ["cm", "in"] },
  { value: "bicep", label: "Bicep", units: ["cm", "in"] },
  { value: "thigh", label: "Thigh", units: ["cm", "in"] },
];

type Metric = {
  id: number;
  date: string;
  metricType: string;
  value: number;
  unit: string;
  notes: string | null;
};

type Props = {
  initialMetrics: Metric[];
  defaultWeightUnit: string;
  defaultMeasurementUnit: string;
};

export function MetricsClient({
  initialMetrics,
  defaultWeightUnit,
  defaultMeasurementUnit,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState("weight");
  const [metricType, setMetricType] = useState("weight");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const currentUnit = useMemo(() => {
    const type = METRIC_TYPES.find((t) => t.value === metricType);
    if (!type) return defaultWeightUnit;
    if (type.units.includes(defaultWeightUnit)) return defaultWeightUnit;
    if (type.units.includes(defaultMeasurementUnit)) return defaultMeasurementUnit;
    return type.units[0];
  }, [metricType, defaultWeightUnit, defaultMeasurementUnit]);

  const filteredMetrics = useMemo(
    () => initialMetrics.filter((m) => m.metricType === activeTab),
    [initialMetrics, activeTab]
  );

  function handleSubmit() {
    if (!value) return;
    const formData = new FormData();
    formData.set("metricType", metricType);
    formData.set("value", value);
    formData.set("unit", currentUnit);
    formData.set("date", date);

    startTransition(async () => {
      const result = await addMetric(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Metric logged!");
        setValue("");
        router.refresh();
      }
    });
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      await deleteMetric(id);
      router.refresh();
    });
  }

  function getTrend(metrics: Metric[]) {
    if (metrics.length < 2) return null;
    const diff = metrics[0].value - metrics[1].value;
    if (Math.abs(diff) < 0.01) return "same";
    return diff > 0 ? "up" : "down";
  }

  const trend = getTrend(filteredMetrics);

  return (
    <div className="mt-4 space-y-4">
      {/* Quick Entry */}
      <Card className="surface border-white/10 rounded-2xl">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Metric</Label>
              <Select
                value={metricType}
                onValueChange={(v) => {
                  if (!v) return;
                  setMetricType(v);
                  setActiveTab(v);
                }}
              >
                <SelectTrigger className="h-11 rounded-xl bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METRIC_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 rounded-xl bg-white/5 border-white/10"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                type="number"
                inputMode="decimal"
                placeholder="Value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="h-12 rounded-xl bg-white/5 border-white/10 pr-12 text-lg font-semibold"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {currentUnit}
              </span>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={pending || !value}
              className="h-12 px-6 rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              Log
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tab bar */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {METRIC_TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border",
              activeTab === t.value
                ? "bg-primary text-primary-foreground border-transparent"
                : "border-white/10 text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Latest + Trend */}
      {filteredMetrics.length > 0 && (
        <div className="flex items-center gap-3 surface rounded-2xl p-4 border border-white/10">
          <div className="flex-1">
            <p className="text-3xl font-bold">
              {filteredMetrics[0].value}
              <span className="text-base text-muted-foreground ml-1">
                {filteredMetrics[0].unit}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">Latest reading</p>
          </div>
          {trend && (
            <div
              className={cn(
                "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium",
                trend === "up" && "bg-emerald-500/20 text-emerald-400",
                trend === "down" && "bg-rose-500/20 text-rose-400",
                trend === "same" && "bg-muted text-muted-foreground"
              )}
            >
              {trend === "up" && <TrendingUp className="h-3 w-3" />}
              {trend === "down" && <TrendingDown className="h-3 w-3" />}
              {trend === "same" && <Minus className="h-3 w-3" />}
              {trend === "same"
                ? "No change"
                : `${Math.abs(filteredMetrics[0].value - filteredMetrics[1].value).toFixed(1)} ${filteredMetrics[0].unit}`}
            </div>
          )}
        </div>
      )}

      {/* History List */}
      <div className="space-y-1">
        {filteredMetrics.map((metric) => (
          <div
            key={metric.id}
            className="flex items-center justify-between rounded-xl p-3 hover:bg-white/5 transition-colors"
          >
            <div>
              <p className="text-sm font-medium">
                {metric.value} {metric.unit}
              </p>
              <p className="text-xs text-muted-foreground">{metric.date}</p>
            </div>
            <button
              onClick={() => handleDelete(metric.id)}
              disabled={pending}
              className="text-muted-foreground hover:text-destructive transition-colors p-1"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}

        {filteredMetrics.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No {activeTab.replace("_", " ")} entries yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
