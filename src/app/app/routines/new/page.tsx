"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createRoutine } from "../actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BlurFade } from "@/components/ui/blur-fade";
import { CalendarDays } from "lucide-react";

export default function NewRoutinePage() {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleCreate() {
    if (!name.trim()) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name.trim());
      const result = await createRoutine(formData);
      if (result?.routineId) {
        router.push(`/app/routines/${result.routineId}`);
      }
    });
  }

  return (
    <div className="px-4 pt-8">
      <BlurFade delay={0}>
        <h1 className="text-2xl font-bold tracking-tight">New Routine</h1>
      </BlurFade>

      <BlurFade delay={0.1}>
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>Routine Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Push/Pull/Legs"
              className="h-12 rounded-xl bg-white/5 border-white/10"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={pending || !name.trim()}
            className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 mt-4"
          >
            <CalendarDays className="h-5 w-5 mr-2" />
            {pending ? "Creating..." : "Create Routine"}
          </Button>
        </div>
      </BlurFade>
    </div>
  );
}
