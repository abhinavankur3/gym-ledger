"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { checkIn, checkOut } from "./actions";

/** Floating check-in/out card for the dashboard. */
export function CheckInTile({ checkInTime, className }: { checkInTime: string | null; className?: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const isCheckedIn = !!checkInTime;

  function toggle() {
    startTransition(async () => {
      const result = isCheckedIn ? await checkOut() : await checkIn();
      if (result?.error) toast.error(result.error);
      else {
        toast.success(isCheckedIn ? "Checked out" : "Checked in");
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={isCheckedIn ? "Check out of the gym" : "Check in to the gym"}
      className={cn("flex flex-col rounded-3xl bg-card p-4 text-left shadow-soft transition-transform active:scale-[0.98] disabled:opacity-60", className)}
    >
      <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", isCheckedIn ? "bg-legs text-ink" : "bg-legs/15 text-legs")}>
        <MapPin className="h-5 w-5" />
      </span>
      <span className="mt-3 font-semibold leading-tight" suppressHydrationWarning>
        {pending
          ? "…"
          : isCheckedIn
            ? new Date(checkInTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
            : "Check in"}
      </span>
      <span className="mt-0.5 text-xs text-muted-foreground">{isCheckedIn ? "At the gym. Tap to leave" : "At the gym?"}</span>
    </button>
  );
}
