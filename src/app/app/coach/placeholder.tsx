import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE_BG, type SessionTone } from "@/lib/muscles";

/** Tone block with watermark and a floating icon badge, for screens that aren't built yet. */
export function PlaceholderHero({ tone, kicker, title, watermark, icon: Icon, className }: { tone: SessionTone; kicker: string; title: string; watermark: string; icon: LucideIcon; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div className={cn("relative h-56 overflow-hidden rounded-[2rem] p-6 text-ink", TONE_BG[tone])}>
        <span aria-hidden className="pointer-events-none absolute -left-2 top-10 select-none whitespace-nowrap font-display text-[7.5rem] leading-none text-white/25">{watermark}</span>
        <p className="relative text-sm font-semibold text-ink/70">{kicker}</p>
        <h1 className="relative mt-14 max-w-[60%] font-display text-[2.6rem] leading-[0.95]">{title}<span className="text-white">.</span></h1>
      </div>
      <span aria-hidden className="animate-hero-drop absolute -bottom-8 right-6 flex h-24 w-24 rotate-6 items-center justify-center rounded-[1.75rem] bg-card text-ink shadow-lift dark:text-foreground">
        <Icon className="h-11 w-11" strokeWidth={1.75} />
      </span>
    </div>
  );
}

export function PlannedFeatures({ intro, features }: { intro: string; features: { icon: LucideIcon; title: string; detail: string }[] }) {
  return (
    <section aria-labelledby="planned-heading" className="mt-14">
      <div className="flex items-center gap-2">
        <h2 id="planned-heading" className="font-display text-xl">What’s coming</h2>
        <span className="rounded-full bg-sun px-2.5 py-0.5 text-xs font-bold text-ink">In progress</span>
      </div>
      <p className="mt-2 text-muted-foreground">{intro}</p>
      <ul className="mt-4 divide-y divide-border overflow-hidden rounded-3xl bg-card shadow-soft dark:ring-1 dark:ring-white/5">
        {features.map((feature) => (
          <li key={feature.title} className="flex gap-4 p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted text-primary">
              <feature.icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-semibold">{feature.title}</span>
              <span className="mt-1 block text-sm leading-6 text-muted-foreground">{feature.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-muted-foreground">Nothing here is live yet. Your workout log will carry over when it is.</p>
    </section>
  );
}
