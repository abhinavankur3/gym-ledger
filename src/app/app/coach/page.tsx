import Link from "next/link";
import { MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CoachPage() {
  return <main className="px-4 pt-8"><div className="mt-2 rounded-3xl border border-border bg-card p-6"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12"><MessageCircle className="h-6 w-6 text-primary" /></div><p className="mt-6 text-xs font-bold uppercase tracking-[0.16em] text-primary">Coach</p><h1 className="mt-2 text-3xl font-bold">Make sense of your data.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Your coach will turn workouts, nutrition, and progress into clear next steps. First, we&apos;re building the deterministic fitness core that makes every recommendation trustworthy.</p><Button disabled className="mt-6 h-11 w-full rounded-2xl">Coach chat coming next</Button></div><div className="mt-4 flex gap-3 rounded-2xl border border-primary/20 bg-primary/8 p-4"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p className="text-sm leading-5">Ask questions in natural language once your workout and progress history are connected.</p></div></main>;
}
