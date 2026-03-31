"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActiveRoutine } from "./actions";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { toast } from "sonner";

export function SetActiveButton({ routineId }: { routineId: number }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSetActive(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      await setActiveRoutine(routineId);
      toast.success("Routine set as active");
      router.refresh();
    });
  }

  return (
    <Button
      size="sm"
      onClick={handleSetActive}
      disabled={pending}
      className="rounded-xl bg-primary text-primary-foreground text-xs h-8"
    >
      <Check className="h-3 w-3 mr-1" />
      {pending ? "Setting..." : "Set Active"}
    </Button>
  );
}
