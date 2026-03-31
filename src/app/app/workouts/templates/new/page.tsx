"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTemplate } from "../actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BlurFade } from "@/components/ui/blur-fade";
import { FileText } from "lucide-react";

export default function NewTemplatePage() {
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleCreate() {
    if (!name.trim()) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name.trim());
      const result = await createTemplate(formData);
      if (result?.templateId) {
        router.push(`/app/workouts/templates/${result.templateId}`);
      }
    });
  }

  return (
    <div className="px-4 pt-8">
      <BlurFade delay={0}>
        <h1 className="text-2xl font-bold tracking-tight">New Template</h1>
      </BlurFade>

      <BlurFade delay={0.1}>
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label>Template Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Push Day"
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
            <FileText className="h-5 w-5 mr-2" />
            {pending ? "Creating..." : "Create Template"}
          </Button>
        </div>
      </BlurFade>
    </div>
  );
}
