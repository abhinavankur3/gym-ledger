"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { checkIn, checkOut } from "./actions";

/** Compact check-in/out toggle for the dashboard stat row. */
export function CheckInTile({ checkInTime }: { checkInTime: string | null }) {
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

  const Icon = isCheckedIn ? LogOut : LogIn;
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-label={isCheckedIn ? "Check out of the gym" : "Check in to the gym"}
      className={cn(
        "rounded-2xl border bg-card p-3 text-left transition-colors hover:border-primary/40 disabled:opacity-60",
        isCheckedIn ? "border-primary/40" : "border-border"
      )}
    >
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-2 text-lg font-bold" suppressHydrationWarning>
        {pending ? "…" : isCheckedIn ? new Date(checkInTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Check in"}
      </p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {isCheckedIn ? "Tap to check out" : "At the gym?"}
      </p>
    </button>
  );
}
