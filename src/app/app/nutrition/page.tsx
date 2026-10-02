import Link from "next/link";
import { Apple, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NutritionPage() {
  return <main className="px-4 pt-8"><Link href="/app/more" className="text-sm font-semibold text-muted-foreground">← More</Link><div className="mt-10 rounded-3xl border border-border bg-card p-6"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12"><Apple className="h-6 w-6 text-primary" /></div><p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-primary">Nutrition</p><h1 className="mt-2 text-3xl font-bold">Fuel your training.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Meal logging and simple daily targets are next in the redesign. We&apos;ll keep the focus on fast entries, useful protein guidance, and no giant food database.</p><Button disabled className="mt-6 h-11 w-full rounded-2xl">Coming next</Button></div><div className="mt-4 flex gap-3 rounded-2xl border border-primary/20 bg-primary/8 p-4"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p className="text-sm leading-5">Your workout history will become the context for smarter nutrition recommendations.</p></div></main>;
}
