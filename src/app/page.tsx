import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, Check, Dumbbell, LineChart, MessageCircle, Salad } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { BrandMark } from "@/components/brand-mark";
import { EquipmentArt } from "@/components/equipment-art";
import { SessionHero } from "@/components/session-hero";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Kochi — your coach for training and food",
  description: "Kochi builds your weekly workouts and meals, then helps you follow them with one tap per set and one tap per meal.",
};

/** Public landing page. Always shown at "/", signed in or not; the CTA goes to the right place. */
export default async function LandingPage() {
  const session = await getSession();
  const cta = session
    ? { href: session.role === "admin" ? "/admin" : "/app", label: "Open Kochi" }
    : { href: "/login", label: "Sign in to Kochi" };

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Kochi home">
          <BrandMark className="h-9 w-9" />
          <span className="font-display text-2xl">Kochi<span className="text-primary">.</span></span>
        </Link>
        <Link href={cta.href} className="inline-flex h-11 items-center rounded-2xl bg-card px-5 text-sm font-semibold shadow-soft hover:bg-muted">
          {session ? "Open app" : "Sign in"}
        </Link>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pt-8 pb-20 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-sm font-semibold shadow-soft">
              <span className="h-2 w-2 rounded-full bg-legs" aria-hidden /> Kochi is Japanese for coach
            </p>
            <h1 className="mt-6 font-display text-[3.25rem] leading-[0.95] sm:text-7xl">
              Your coach for training and food<span className="text-primary">.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              Tell Kochi your goal, schedule and kitchen. It builds your week of workouts and meals, then you follow along with one tap per set and one tap per meal.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={cta.href} className="inline-flex h-14 items-center justify-center rounded-2xl bg-primary px-8 text-base font-semibold text-primary-foreground shadow-glow hover:bg-primary/90">
                {cta.label}
              </Link>
              <a href="#how-it-works" className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl px-6 text-base font-semibold text-muted-foreground hover:text-foreground">
                How it works <ArrowDown className="h-4 w-4" />
              </a>
            </div>
          </div>

          <HeroPreview />
        </section>

        {/* How it works */}
        <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-8 bg-card/60 py-20 dark:bg-card/40">
          <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
            <h2 id="how-heading" className="max-w-2xl font-display text-4xl sm:text-5xl">From a few questions to a plan you can actually follow<span className="text-primary">.</span></h2>
            <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, i) => (
                <li key={step.title} className="rounded-3xl bg-card p-6 shadow-soft dark:ring-1 dark:ring-white/5">
                  <span className={cn("flex h-11 w-11 items-center justify-center rounded-2xl font-display text-xl text-ink", step.tone)}>{i + 1}</span>
                  <h3 className="mt-5 font-display text-xl">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
                  {step.soon && <p className="mt-3 inline-flex rounded-full bg-sun px-2.5 py-0.5 text-xs font-bold text-ink">Coming soon</p>}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* What's inside */}
        <section aria-labelledby="features-heading" className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
          <h2 id="features-heading" className="font-display text-4xl sm:text-5xl">Everything in one place<span className="text-primary">.</span></h2>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {FEATURES.map((f) => (
              <article key={f.title} className="overflow-hidden rounded-[2rem] bg-card shadow-soft dark:ring-1 dark:ring-white/5">
                <div className={cn("relative h-36 overflow-hidden p-6 text-ink", f.tone)}>
                  <span aria-hidden className="pointer-events-none absolute -left-1 top-10 select-none whitespace-nowrap font-display text-[6rem] leading-none text-white/25">{f.watermark}</span>
                  <f.icon className="relative h-7 w-7" />
                  {f.soon && <span className="absolute right-5 top-5 rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-bold">Coming soon</span>}
                </div>
                <div className="p-6">
                  <h3 className="font-display text-2xl">{f.title}</h3>
                  <ul className="mt-4 space-y-2.5">
                    {f.points.map((point) => (
                      <li key={point} className="flex gap-2.5 text-[0.95rem] leading-6">
                        <Check className="mt-1 h-4 w-4 shrink-0 text-legs" strokeWidth={3} aria-hidden />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-24 text-center sm:px-8">
          <h2 className="mx-auto max-w-2xl font-display text-4xl sm:text-5xl">Ready when you are<span className="text-primary">.</span></h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">{session ? "Pick up where you left off." : "Sign in and Kochi will build your first week."}</p>
          <Link href={cta.href} className="mt-8 inline-flex h-14 items-center justify-center rounded-2xl bg-primary px-10 text-base font-semibold text-primary-foreground shadow-glow hover:bg-primary/90">
            {cta.label}
          </Link>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:px-8">
          <span className="flex items-center gap-2"><BrandMark className="h-6 w-6" /> Kochi</span>
          <span>Training and nutrition estimates, not medical advice.</span>
        </div>
      </footer>
    </div>
  );
}

const STEPS = [
  { title: "Tell Kochi about you", body: "Goal, experience, training days, equipment, diet and anything to avoid. About two minutes.", tone: "bg-sun" },
  { title: "Review your plans", body: "Kochi drafts a training week and a meal plan from your local food. Ask for changes until it fits.", tone: "bg-push" },
  { title: "Follow with one tap", body: "Planned sets and meals are filled in. Tap when a set is done or a meal is eaten, or snap a photo.", tone: "bg-legs" },
  { title: "Kochi adapts", body: "Weekly check-ins look at what you actually did and suggest changes, with a reason for each.", tone: "bg-pull", soon: true },
];

const FEATURES = [
  {
    title: "Training",
    watermark: "Train",
    icon: Dumbbell,
    tone: "bg-push",
    points: [
      "A weekly plan built around your days, session length and equipment",
      "Each set pre-filled with a suggested weight and reps; one tap logs it",
      "Weight goes up when you hit the top of your rep range",
      "Rest timer, personal records and full history",
    ],
  },
  {
    title: "Nutrition",
    watermark: "Fuel",
    icon: Salad,
    tone: "bg-legs",
    points: [
      "Calorie and protein targets worked out from your body and training",
      "A week of everyday meals from your region's cooking, for your diet",
      "Log a planned meal in one tap, or estimate anything else from a photo",
      "A protein shake fills the gap when meals fall short",
    ],
  },
  {
    title: "Progress",
    watermark: "Trend",
    icon: LineChart,
    tone: "bg-pull",
    points: ["Body weight, training volume and records over time", "Attendance streaks and check-ins", "Daily intake against your targets"],
  },
  {
    title: "Coach",
    watermark: "Kochi",
    icon: MessageCircle,
    tone: "bg-sun",
    soon: true,
    points: ["Ask about your training and meals in plain words", "Understand why your plan changed", "Get back on track after a missed week"],
  },
];

/** Layered preview built from the app's own components (illustrative values). */
function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden>
      <div className="rounded-[2.25rem] bg-card p-4 shadow-lift dark:ring-1 dark:ring-white/5">
        <SessionHero tone="push" kicker="Today" title="Upper A" art="dumbbell" meta="5 exercises" />
        <div className="mt-16 space-y-2 px-1 pb-28">
          {[
            ["62.5", "8", true],
            ["62.5", "8", false],
          ].map(([w, r, done], i) => (
            <div key={i} className={cn("flex items-center gap-3 rounded-2xl px-3 py-2.5", done ? "bg-legs/15" : "bg-primary/8 ring-1 ring-primary/30")}>
              <span className={cn("flex h-11 w-11 items-center justify-center rounded-full", done ? "bg-legs text-ink" : "bg-primary text-primary-foreground shadow-glow")}>
                <Check className="h-5 w-5" strokeWidth={3} />
              </span>
              <span className="flex items-baseline gap-1.5 font-display tabular text-2xl">
                {w}<span className="font-sans text-sm text-muted-foreground">kg</span><span className="font-sans text-base text-muted-foreground">×</span>{r}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">Set {i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating cards */}
      <div className="absolute -right-2 -bottom-8 w-48 rounded-3xl bg-card p-4 shadow-lift sm:-right-8 dark:ring-1 dark:ring-white/5">
        <div className="relative -mt-12 mb-1 flex justify-center"><EquipmentArt kind="bowl" className="w-28" /></div>
        <p className="text-sm text-muted-foreground">Lunch</p>
        <p className="font-display text-lg leading-tight">Rajma chawal</p>
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-legs px-2.5 py-1 text-xs font-bold text-ink"><Check className="h-3.5 w-3.5" strokeWidth={3} /> Ate it</p>
      </div>
      <div className="absolute -bottom-6 -left-3 hidden w-44 rounded-3xl bg-card p-4 shadow-lift sm:block sm:-left-10 dark:ring-1 dark:ring-white/5">
        <p className="text-sm text-muted-foreground">Protein today</p>
        <p className="mt-1 font-display tabular text-3xl">118<span className="ml-1 font-sans text-sm text-muted-foreground">/ 140 g</span></p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full w-[84%] rounded-full bg-legs" /></div>
      </div>
    </div>
  );
}
