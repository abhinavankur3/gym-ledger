"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  assignTemplateToDay,
  removeTemplateFromDay,
  setActiveRoutine,
  deleteRoutine,
} from "../actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BlurFade } from "@/components/ui/blur-fade";
import { cn } from "@/lib/utils";
import { ArrowLeft, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type RoutineDay = {
  id: number;
  dayOfWeek: number;
  templateId: number;
  templateName: string;
};

type Routine = {
  id: number;
  name: string;
  isActive: boolean;
  days: RoutineDay[];
};

type TemplateOption = {
  id: number;
  name: string;
  exerciseCount: number;
};

type Props = {
  routine: Routine;
  templates: TemplateOption[];
};

export function RoutineEditor({ routine, templates }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  function handleDayTap(dayOfWeek: number) {
    setSelectedDay(dayOfWeek);
    setSheetOpen(true);
  }

  function handleAssignTemplate(templateId: number) {
    if (selectedDay === null) return;
    startTransition(async () => {
      await assignTemplateToDay(routine.id, selectedDay, templateId);
      setSheetOpen(false);
      setSelectedDay(null);
      router.refresh();
    });
  }

  function handleClearDay() {
    if (selectedDay === null) return;
    startTransition(async () => {
      await removeTemplateFromDay(routine.id, selectedDay);
      setSheetOpen(false);
      setSelectedDay(null);
      router.refresh();
    });
  }

  function handleSetActive() {
    startTransition(async () => {
      await setActiveRoutine(routine.id);
      toast.success("Routine set as active");
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm("Delete this routine? This cannot be undone.")) return;
    startTransition(async () => {
      await deleteRoutine(routine.id);
      toast.success("Routine deleted");
      router.push("/app/routines");
    });
  }

  function getDayTemplate(dayOfWeek: number) {
    return routine.days.find((d) => d.dayOfWeek === dayOfWeek);
  }

  return (
    <div className="px-4 pt-8 pb-24">
      <BlurFade delay={0}>
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/app/routines"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {routine.name}
            </h1>
            {routine.isActive && (
              <p className="text-xs text-primary">Active routine</p>
            )}
          </div>
        </div>
      </BlurFade>

      {/* 7-day grid */}
      <BlurFade delay={0.1}>
        <div className="space-y-2">
          {DAY_LABELS.map((dayLabel, dayIdx) => {
            const assigned = getDayTemplate(dayIdx);
            return (
              <button
                key={dayIdx}
                onClick={() => handleDayTap(dayIdx)}
                className={cn(
                  "w-full rounded-2xl p-4 text-left transition-colors flex items-center justify-between",
                  assigned
                    ? "surface border border-primary/20 hover:border-primary/40"
                    : "surface border border-white/10 hover:bg-white/5"
                )}
              >
                <div>
                  <p className="text-xs text-muted-foreground">
                    {dayLabel}
                  </p>
                  <p
                    className={cn(
                      "font-medium mt-0.5",
                      assigned ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {assigned ? assigned.templateName : "Rest"}
                  </p>
                </div>
                <span
                  className={cn(
                    "text-xs font-medium px-2 py-1 rounded-lg",
                    assigned
                      ? "bg-primary/20 text-primary"
                      : "bg-white/5 text-muted-foreground"
                  )}
                >
                  {DAY_SHORT[dayIdx]}
                </span>
              </button>
            );
          })}
        </div>
      </BlurFade>

      {/* Actions */}
      <BlurFade delay={0.2}>
        <div className="mt-6 space-y-3">
          {!routine.isActive && (
            <Button
              onClick={handleSetActive}
              disabled={pending}
              className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90"
            >
              <Check className="h-5 w-5 mr-2" />
              {pending ? "Setting..." : "Set as Active Routine"}
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={pending}
            className="w-full h-10 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Routine
          </Button>
        </div>
      </BlurFade>

      {/* Template Picker Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="surface border-white/10 rounded-t-2xl"
        >
          <SheetHeader>
            <SheetTitle>
              {selectedDay !== null
                ? `${DAY_LABELS[selectedDay]} Workout`
                : "Select Template"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2 max-h-[50vh] overflow-y-auto">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => handleAssignTemplate(t.id)}
                disabled={pending}
                className="w-full text-left rounded-xl p-4 hover:bg-white/5 transition-colors flex items-center justify-between surface border border-white/10"
              >
                <div>
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.exerciseCount} exercise{t.exerciseCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </button>
            ))}

            {templates.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No templates yet. Create one first.
                </p>
                <Link
                  href="/app/workouts/templates/new"
                  className="mt-3 inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium"
                >
                  Create Template
                </Link>
              </div>
            )}

            {/* Clear / Rest option */}
            {selectedDay !== null && getDayTemplate(selectedDay) && (
              <button
                onClick={handleClearDay}
                disabled={pending}
                className="w-full text-left rounded-xl p-4 hover:bg-white/5 transition-colors flex items-center gap-3 border border-dashed border-white/20"
              >
                <X className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Rest (clear)
                </span>
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
