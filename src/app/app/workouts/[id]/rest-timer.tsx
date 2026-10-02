"use client";

import { useEffect, useState } from "react";
import { Plus, Timer, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Default rest between working sets. */
export const DEFAULT_REST_SECONDS = 90;

/** When a rest that starts now should end. Call from event handlers, not render. */
export function restDeadline(seconds = DEFAULT_REST_SECONDS) {
  return Date.now() + seconds * 1000;
}

/**
 * Floating countdown shown after a set is logged. `endsAt` is a timestamp (ms);
 * the parent owns it so logging another set simply restarts the timer.
 */
export function RestTimer({ endsAt, onChange }: { endsAt: number | null; onChange: (endsAt: number | null) => void }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setNow(Date.now());
    const frame = requestAnimationFrame(tick); // sync immediately so a restart never shows a stale time
    const id = setInterval(tick, 250);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(id);
    };
  }, [endsAt]);

  const remaining = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0;
  const finished = !!endsAt && remaining === 0;

  useEffect(() => {
    if (!finished) return;
    navigator.vibrate?.([120, 80, 120]);
    // Leave the "done" state visible briefly, then get out of the way
    const id = setTimeout(() => onChange(null), 4000);
    return () => clearTimeout(id);
  }, [finished, onChange]);

  if (!endsAt) return null;

  const label = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;
  return (
    <div
      role="timer"
      aria-live={finished ? "assertive" : "off"}
      aria-label={finished ? "Rest finished" : `Rest, ${label} remaining`}
      className="fixed inset-x-0 bottom-[calc(5.75rem+max(0.75rem,env(safe-area-inset-bottom,0px)))] z-40 flex justify-center px-4 md:bottom-6 md:pl-28"
    >
      <div className={cn("flex items-center gap-1 rounded-full py-1.5 pr-1.5 pl-4 shadow-lift", finished ? "bg-legs text-ink" : "bg-ink text-white dark:bg-popover dark:text-foreground")}>
        <Timer className="h-4 w-4 shrink-0" />
        <span className="ml-1.5 min-w-[7.5rem] font-display tabular text-lg">{finished ? "Rest done — next set" : `Rest ${label}`}</span>
        {!finished && (
          <button type="button" onClick={() => onChange(endsAt + 30_000)} aria-label="Add 30 seconds" className="flex h-9 items-center gap-0.5 rounded-full px-3 text-sm font-semibold hover:bg-white/10">
            <Plus className="h-3.5 w-3.5" />30s
          </button>
        )}
        <button type="button" onClick={() => onChange(null)} aria-label={finished ? "Dismiss" : "Skip rest"} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
