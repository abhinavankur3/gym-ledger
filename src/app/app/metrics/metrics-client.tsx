"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { addMetric, deleteMetric } from "./actions";
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
        toast.success("Reading logged");
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

  const activeLabel = METRIC_TYPES.find((t) => t.value === activeTab)?.label ?? "Metric";
  const latest = filteredMetrics[0];

  return (
    <div className="space-y-3">
      {/* Latest reading: the one bold element */}
      <section aria-label={`Latest ${activeLabel.toLowerCase()}`} className="relative overflow-hidden rounded-[2rem] bg-pull p-6 text-ink">
        <span aria-hidden className="pointer-events-none absolute -right-3 -top-5 select-none whitespace-nowrap font-display text-[7rem] leading-none text-white/25">
          {activeLabel}
        </span>
        <p className="relative text-sm font-semibold text-ink/70">Latest {activeLabel.toLowerCase()}</p>
        {latest ? (
          <>
            <p className="relative mt-6 flex items-baseline gap-1.5">
              <span className="font-display tabular text-6xl">{latest.value}</span>
              <span className="text-lg font-semibold">{latest.unit}</span>
            </p>
            <div className="relative mt-4 flex flex-wrap items-center gap-2 text-sm font-semibold">
              <span className="rounded-full bg-white/35 px-3 py-1">{latest.date}</span>
              {trend && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/35 px-3 py-1">
                  {trend === "up" && <TrendingUp className="h-4 w-4" />}
                  {trend === "down" && <TrendingDown className="h-4 w-4" />}
                  {trend === "same" && <Minus className="h-4 w-4" />}
                  {trend === "same"
                    ? "No change"
                    : `${trend === "up" ? "+" : "−"}${Math.abs(latest.value - filteredMetrics[1].value).toFixed(1)} ${latest.unit} since last`}
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="relative mt-6 font-display text-[2.6rem] leading-[0.95]">No readings yet<span className="text-white">.</span></p>
            <p className="relative mt-3 text-sm font-medium text-ink/75">Log your first one below.</p>
          </>
        )}
      </section>

      {/* Quick entry */}
      <section aria-labelledby="log-heading" className="rounded-3xl bg-card p-5 shadow-soft dark:ring-1 dark:ring-white/5">
        <h2 id="log-heading" className="font-display text-xl">Log a reading</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="metric-type" className="text-sm text-muted-foreground">Metric</Label>
            <Select
              value={metricType}
              onValueChange={(v) => {
                if (!v) return;
                setMetricType(v);
                setActiveTab(v);
              }}
            >
              <SelectTrigger id="metric-type" className="w-full">
                <SelectValue>{(value: string) => METRIC_TYPES.find((t) => t.value === value)?.label ?? value}</SelectValue>
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
          <div className="space-y-1.5">
            <Label htmlFor="metric-date" className="text-sm text-muted-foreground">Date</Label>
            <Input id="metric-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex gap-3">
          <div className="relative flex-1">
            <Label htmlFor="metric-value" className="sr-only">Value</Label>
            <Input
              id="metric-value"
              type="number"
              inputMode="decimal"
              placeholder="Value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-14 pr-14 font-display text-2xl"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">{currentUnit}</span>
          </div>
          <Button onClick={handleSubmit} disabled={pending || !value} size="lg">
            Log
          </Button>
        </div>
      </section>

      {/* History */}
      <section aria-labelledby="history-heading" className="pt-5">
        <h2 id="history-heading" className="font-display text-xl">History</h2>
        <div role="tablist" aria-label="Metric" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar sm:-mx-6 sm:px-6">
          {METRIC_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={activeTab === t.value}
              onClick={() => setActiveTab(t.value)}
              className={cn(
                "h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
                activeTab === t.value ? "bg-primary text-primary-foreground shadow-glow" : "bg-card text-muted-foreground shadow-soft hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {filteredMetrics.length > 0 ? (
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {filteredMetrics.map((metric) => (
              <li key={metric.id} className="grid grid-cols-[1fr_7.5rem_3rem] items-center">
                <span className="px-4 py-3 text-[0.95rem]">{metric.date}</span>
                <span className="tabular flex h-full items-center justify-end border-l border-border px-4 font-semibold">
                  {metric.value} <span className="ml-1 text-sm font-normal text-muted-foreground">{metric.unit}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(metric.id)}
                  disabled={pending}
                  aria-label={`Delete ${activeLabel.toLowerCase()} reading from ${metric.date}`}
                  className="flex h-full min-h-12 items-center justify-center border-l border-border text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
            No {activeLabel.toLowerCase()} readings yet. Choose {activeLabel.toLowerCase()} above and log one.
          </div>
        )}
      </section>
    </div>
  );
}
