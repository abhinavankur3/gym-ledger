"use client";

import { useTransition } from "react";
import { checkIn, checkOut } from "./actions";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";
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
        toast.success(isCheckedIn ? "Checked out!" : "Checked in!");
      }
    });
  }

  return (
    <div className="text-center space-y-3">
      {isCheckedIn && checkInTime && (
        <p className="text-sm text-muted-foreground">
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
        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90"
      >
        {pending ? (
          "..."
        ) : isCheckedIn ? (
          <>
            <LogOut className="h-5 w-5 mr-2" />
            Check Out
          </>
        ) : (
          <>
            <LogIn className="h-5 w-5 mr-2" />
            Check In
          </>
        )}
      </Button>
    </div>
  );
}
