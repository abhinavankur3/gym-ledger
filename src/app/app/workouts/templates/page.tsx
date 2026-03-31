import { requireUser } from "@/lib/auth/dal";
import { getTemplates } from "./actions";
import { BlurFade } from "@/components/ui/blur-fade";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  chest: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  back: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  shoulders: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  biceps: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  triceps: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  quads: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  hamstrings: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  glutes: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  calves: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  core: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  forearms: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  full_body: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

export default async function TemplatesPage() {
  await requireUser();
  const templates = await getTemplates();

  return (
    <div className="px-4 pt-8">
      <BlurFade delay={0}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
          <Link
            href="/app/workouts/templates/new"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"
          >
            <Plus className="h-5 w-5" />
          </Link>
        </div>
      </BlurFade>

      <div className="mt-4 space-y-3">
        {templates.map((template, i) => (
          <BlurFade key={template.id} delay={0.05 * (i + 1)}>
            <Link href={`/app/workouts/templates/${template.id}`}>
              <Card className="surface border-white/10 rounded-2xl hover:bg-white/5 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{template.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {template.exerciseCount} exercise{template.exerciseCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {template.muscleGroups.length > 0 && (
                    <div className="mt-3 flex gap-1.5 flex-wrap">
                      {template.muscleGroups.map((mg) => (
                        <Badge
                          key={mg}
                          variant="outline"
                          className={cn(
                            "text-[9px]",
                            MUSCLE_GROUP_COLORS[mg]
                          )}
                        >
                          {mg.replace("_", " ")}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          </BlurFade>
        ))}

        {templates.length === 0 && (
          <BlurFade delay={0.1}>
            <div className="text-center py-16">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No templates yet</p>
              <Link
                href="/app/workouts/templates/new"
                className="mt-4 inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2 text-sm font-medium"
              >
                <Plus className="h-4 w-4" /> Create Your First Template
              </Link>
            </div>
          </BlurFade>
        )}
      </div>
    </div>
  );
}
