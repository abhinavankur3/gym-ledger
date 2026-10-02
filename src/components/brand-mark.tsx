import { cn } from "@/lib/utils";

/** A bumper plate seen face-on: the app's mark. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("h-8 w-8", className)}>
      <circle cx="16" cy="16" r="15" className="fill-sun" />
      <circle cx="16" cy="16" r="10.5" fill="none" className="stroke-ink/25" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="3.5" className="fill-ink" />
    </svg>
  );
}
