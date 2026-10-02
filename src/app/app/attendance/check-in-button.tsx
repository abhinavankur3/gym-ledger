"use client";

import { useTransition } from "react";
import { checkIn, checkOut } from "./actions";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, LogOut } from "lucide-react";
import { toast } from "sonner";

type Props = {
  isCheckedIn: boolean;
  checkInTime?: string | null;
};

export function CheckInButton({ isCheckedIn, checkInTime }: Props) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = isCheckedIn ? await checkOut() : await checkIn();
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success(isCheckedIn ? "Checked out" : "Checked in");
      }
    });
  }

  return (
    <div className="space-y-3 text-center">
      {isCheckedIn && checkInTime && (
        <p className="text-sm text-muted-foreground" suppressHydrationWarning>
          Checked in at{" "}
          {new Date(checkInTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}

      <Button
        onClick={handleClick}
        disabled={pending}
        size="lg"
        variant={isCheckedIn ? "outline" : "default"}
        className="w-full"
      >
        {pending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            {isCheckedIn ? "Checking out…" : "Checking in…"}
          </>
        ) : isCheckedIn ? (
          <>
            <LogOut className="h-5 w-5" />
            Check out
          </>
        ) : (
          <>
            <LogIn className="h-5 w-5" />
            Check in
          </>
        )}
      </Button>
    </div>
  );
}
