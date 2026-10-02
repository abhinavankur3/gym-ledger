import { cn } from "@/lib/utils";
import { REGION_DOT, muscleLabel, muscleRegion } from "@/lib/muscles";

export function MuscleChip({ muscle, className }: { muscle: string; className?: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full bg-muted px-2.5 text-xs font-medium text-muted-foreground", className)}>
      <span aria-hidden className={cn("h-2 w-2 rounded-full", REGION_DOT[muscleRegion(muscle)])} />
      {muscleLabel(muscle)}
    </span>
  );
}
