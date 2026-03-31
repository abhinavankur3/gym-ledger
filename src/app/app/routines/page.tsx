import { requireUser } from "@/lib/auth/dal";
import { getRoutines } from "./actions";
import { BlurFade } from "@/components/ui/blur-fade";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Plus, CalendarDays } from "lucide-react";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function RoutinesPage() {
  await requireUser();
  const routinesList = await getRoutines();

  return (
    <div className="px-4 pt-8">
      <BlurFade delay={0}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Routines</h1>
          <Link
            href="/app/routines/new"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </div>
      </BlurFade>

      <div className="mt-4 space-y-3">
        {routinesList.map((routine, i) => (
          <BlurFade key={routine.id} delay={0.05 * (i + 1)}>
            <Link href={`/app/routines/${routine.id}`}>
              <Card
                className={cn(
                  "surface rounded-2xl hover:bg-white/5 transition-colors",
                  routine.isActive
                    ? "border-primary/50"
                    : "border-white/10"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{routine.name}</p>
                        {routine.isActive && (
                          <Badge className="text-[9px] bg-primary/20 text-primary border-primary/30">
                            Active
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 flex gap-1">
                        {DAY_LABELS.map((day, dayIdx) => {
                          const assigned = routine.days.find(
                            (d) => d.dayOfWeek === dayIdx
                          );
                          return (
                            <div
                              key={dayIdx}
                              className={cn(
                                "text-[9px] w-8 h-8 rounded-lg flex flex-col items-center justify-center",
                                assigned
                                  ? "bg-primary/20 text-primary"
                                  : "bg-white/5 text-muted-foreground"
                              )}
                            >
                              <span>{day}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </BlurFade>
        ))}

        {routinesList.length === 0 && (
          <BlurFade delay={0.1}>
            <div className="text-center py-16">
              <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No routines yet</p>
              <Link
                href="/app/routines/new"
                className="mt-4 inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium"
              >
                <Plus className="h-4 w-4" /> Create Your First Routine
              </Link>
            </div>
          </BlurFade>
        )}
      </div>
    </div>
  );
}
