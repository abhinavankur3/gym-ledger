"use client";

import { useActionState, useState } from "react";
import { completeOnboarding } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { EquipmentArt } from "@/components/equipment-art";

type Option = readonly [value: string, title: string, description?: string];

const steps = ["Goal", "Experience", "Schedule", "About you", "Preferences"];
const stepIntro = [
  "What should your training work toward?",
  "How much structured training have you done?",
  "How much time can you give it each week?",
  "This sets your starting loads and energy needs.",
  "So the plan only uses what you actually have.",
];
const choices = {
  goal: [["lose_fat", "Lose fat", "Build a sustainable calorie deficit"], ["build_muscle", "Build muscle", "Train consistently and grow stronger"], ["recomposition", "Recomposition", "Build muscle while leaning out"], ["general_fitness", "General fitness", "Feel stronger and move better"]],
  experience: [["beginner", "Beginner", "I’m new to structured training"], ["intermediate", "Intermediate", "I’ve trained consistently before"], ["advanced", "Advanced", "I know my way around a program"]],
  trainingDays: [["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["6", "6"]],
  sessionDuration: [["30", "30 min"], ["45", "45 min"], ["60", "60 min"], ["75", "75+ min"]],
  sex: [["male", "Male"], ["female", "Female"], ["prefer_not_to_say", "Prefer not to say"]],
  activityLevel: [["sedentary", "Mostly sitting", "Little movement outside training"], ["light", "Lightly active", "Some walking or active hobbies"], ["moderate", "Moderately active", "On my feet most days"], ["very_active", "Very active", "Physical work or lots of movement"]],
  equipment: [["full_gym", "Full gym", "Barbells, machines, cables"], ["dumbbells", "Dumbbells", "A pair of adjustable or fixed dumbbells"], ["home_gym", "Home gym", "A personal setup with some equipment"], ["bodyweight", "Bodyweight", "Minimal or no equipment"]],
  dietaryPreferences: [["none", "No restrictions", "I eat a varied diet"], ["vegetarian", "Vegetarian", "No meat or fish"], ["vegan", "Vegan", "No animal products"]],
} as const satisfies Record<string, readonly Option[]>;

type FormState = { goal: string; experience: string; age: string; sex: string; height: string; weight: string; activityLevel: string; trainingDays: string; sessionDuration: string; equipment: string; dietaryPreferences: string; restrictions: string };
type Field = keyof FormState;
const initial: FormState = { goal: "", experience: "", age: "", sex: "", height: "", weight: "", activityLevel: "", trainingDays: "", sessionDuration: "", equipment: "", dietaryPreferences: "", restrictions: "" };

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

/** Returns the first problem on a step, mirroring onboardingSchema's limits. */
function validateStep(step: number, form: FormState, metric: { height: number; weight: number }): string | null {
  if (step === 0 && !form.goal) return "Choose a goal to continue.";
  if (step === 1 && !form.experience) return "Choose your experience level to continue.";
  if (step === 2) {
    if (!form.trainingDays) return "Choose how many days you can train.";
    if (!form.sessionDuration) return "Choose a session length.";
  }
  if (step === 3) {
    const age = Number(form.age);
    if (!form.age || !Number.isInteger(age) || age < 13 || age > 100) return "Enter an age between 13 and 100.";
    if (!form.sex) return "Choose an option for sex.";
    if (!form.height || metric.height < 100 || metric.height > 250) return "Enter a realistic height.";
    if (!form.weight || metric.weight < 30 || metric.weight > 300) return "Enter a realistic weight.";
    if (!form.activityLevel) return "Choose your daily activity level.";
  }
  if (step === 4) {
    if (!form.equipment) return "Choose the equipment you have.";
    if (!form.dietaryPreferences) return "Choose a dietary preference.";
  }
  return null;
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initial);
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [heightUnit, setHeightUnit] = useState<"cm" | "in">("cm");
  const [clientError, setClientError] = useState("");
  const [state, formAction, pending] = useActionState(completeOnboarding, null);

  const update = (key: Field, value: string) => {
    setClientError("");
    setForm((current) => ({ ...current, [key]: value }));
  };

  // The server always receives metric values.
  const metric = {
    height: heightUnit === "cm" ? Number(form.height) : Number(form.height) * CM_PER_IN,
    weight: weightUnit === "kg" ? Number(form.weight) : Number(form.weight) * KG_PER_LB,
  };
  const submitted: FormState = {
    ...form,
    height: form.height ? String(Math.round(metric.height * 10) / 10) : "",
    weight: form.weight ? String(Math.round(metric.weight * 10) / 10) : "",
  };

  const error = clientError || state?.error || "";
  const isLast = step === steps.length - 1;

  function next() {
    const problem = validateStep(step, form, metric);
    if (problem) return setClientError(problem);
    setClientError("");
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      {pending && <GeneratingOverlay />}
      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandMark className="h-10 w-10" />
            <p className="font-display text-xl">Gym Ledger<span className="text-primary">.</span></p>
          </div>
          <p className="tabular text-sm font-semibold text-muted-foreground">Step {step + 1} of {steps.length}</p>
        </div>
        <div className="mb-3 flex gap-1.5" aria-hidden>
          {steps.map((label, index) => <span key={label} className={cn("h-1.5 flex-1 rounded-full bg-muted transition-colors", index <= step && "bg-primary")} />)}
        </div>
        <div className="mb-8 mt-8">
          <h1 className="font-display text-[2.75rem]">{steps[step]}<span className="text-primary">.</span></h1>
          <p className="mt-2 text-muted-foreground">{stepIntro[step]}</p>
        </div>

        <form
          action={formAction}
          onSubmit={(event) => {
            for (let s = 0; s < steps.length; s++) {
              const problem = validateStep(s, form, metric);
              if (problem) {
                event.preventDefault();
                setStep(s);
                setClientError(problem);
                return;
              }
            }
          }}
        >
          {Object.entries(submitted).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}

          {step === 0 && <ChoiceGroup name="goal" value={form.goal} options={choices.goal} onChange={update} />}
          {step === 1 && <ChoiceGroup name="experience" value={form.experience} options={choices.experience} onChange={update} />}
          {step === 2 && (
            <div className="space-y-8">
              <Question label="Days per week" hint="We’ll spread them out with rest days in between.">
                <ChipGroup name="trainingDays" value={form.trainingDays} options={choices.trainingDays} onChange={update} columns={5} />
              </Question>
              <Question label="Session length">
                <ChipGroup name="sessionDuration" value={form.sessionDuration} options={choices.sessionDuration} onChange={update} columns={4} />
              </Question>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <NumberField label="Age" name="age" value={form.age} onChange={update} placeholder="28" min={13} max={100} inputMode="numeric" className="col-span-2 sm:col-span-1" />
                <NumberField
                  label="Height"
                  name="height"
                  value={form.height}
                  onChange={update}
                  placeholder={heightUnit === "cm" ? "175" : "69"}
                  min={heightUnit === "cm" ? 100 : 40}
                  max={heightUnit === "cm" ? 250 : 98}
                  unit={<UnitToggle value={heightUnit} options={["cm", "in"]} onChange={(u) => { setHeightUnit(u); update("height", ""); }} />}
                />
                <NumberField
                  label="Weight"
                  name="weight"
                  value={form.weight}
                  onChange={update}
                  placeholder={weightUnit === "kg" ? "72" : "160"}
                  min={weightUnit === "kg" ? 30 : 66}
                  max={weightUnit === "kg" ? 300 : 660}
                  unit={<UnitToggle value={weightUnit} options={["kg", "lbs"]} onChange={(u) => { setWeightUnit(u); update("weight", ""); }} />}
                />
              </div>
              <Question label="Sex" hint="Used only to estimate energy needs.">
                <ChipGroup name="sex" value={form.sex} options={choices.sex} onChange={update} columns={3} />
              </Question>
              <Question label="Daily activity outside training">
                <ChoiceGroup name="activityLevel" value={form.activityLevel} options={choices.activityLevel} onChange={update} />
              </Question>
            </div>
          )}
          {step === 4 && (
            <div className="space-y-8">
              <Question label="Equipment you can use"><ChoiceGroup name="equipment" value={form.equipment} options={choices.equipment} onChange={update} /></Question>
              <Question label="Diet"><ChoiceGroup name="dietaryPreferences" value={form.dietaryPreferences} options={choices.dietaryPreferences} onChange={update} /></Question>
              <div className="space-y-2">
                <Label htmlFor="restrictions">Anything to avoid? <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="restrictions" value={form.restrictions} onChange={(event) => update("restrictions", event.target.value)} maxLength={200} placeholder="Allergies, foods, or preferences" className="shadow-soft" />
              </div>
            </div>
          )}

          {error && <p role="alert" className="mt-5 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">{error}</p>}

          <div className="mt-8 flex gap-3">
            <Button type="button" variant="outline" aria-label="Previous step" onClick={() => { setClientError(""); setStep((current) => Math.max(current - 1, 0)); }} disabled={step === 0 || pending} size="lg" className="w-14 px-0"><ArrowLeft className="h-5 w-5" /></Button>
            {isLast ? (
              <Button type="submit" size="lg" disabled={pending} className="flex-1">{pending ? <><Loader2 className="h-5 w-5 animate-spin" />Building your plan…</> : "Build my plan"}</Button>
            ) : (
              <Button type="button" size="lg" onClick={next} className="flex-1">Continue</Button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}

function GeneratingOverlay() {
  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0e2a]/60 px-4 backdrop-blur-md">
      <div className="relative w-full max-w-sm">
        <div className="relative h-36 overflow-hidden rounded-t-[2rem] bg-sun text-ink">
          <span aria-hidden className="pointer-events-none absolute -left-2 top-6 select-none whitespace-nowrap font-display text-[6.5rem] leading-none text-white/30">Plan</span>
          <EquipmentArt kind="kettlebell" className="animate-hero-drop absolute -bottom-6 right-4 w-28" />
        </div>
        <div className="rounded-b-[2rem] bg-card p-7 shadow-lift">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="font-display text-2xl">Building your plan<span className="text-primary">.</span></p>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Matching exercises to your schedule and equipment. This can take up to a minute, so keep this screen open.</p>
        </div>
      </div>
    </div>
  );
}

function Question({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="font-display text-lg">{label}</legend>
      {hint && <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </fieldset>
  );
}

function ChoiceGroup({ name, value, options, onChange }: { name: Field; value: string; options: readonly Option[]; onChange: (key: Field, value: string) => void }) {
  return (
    <div role="radiogroup" className="space-y-3">
      {options.map(([option, title, description]) => {
        const selected = value === option;
        return (
          <button type="button" role="radio" aria-checked={selected} key={option} onClick={() => onChange(name, option)} className={cn("flex w-full items-center justify-between gap-4 rounded-3xl bg-card p-5 text-left shadow-soft ring-2 ring-transparent transition-[box-shadow,transform] active:scale-[0.99] dark:ring-white/5", selected && "ring-primary dark:ring-primary")}>
            <span><span className="block text-[1.0625rem] font-bold">{title}</span>{description && <span className="mt-1 block text-sm text-muted-foreground">{description}</span>}</span>
            <span aria-hidden className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-border transition-colors", selected && "border-primary bg-primary text-primary-foreground")}>
              {selected && <Check className="h-4 w-4" strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ChipGroup({ name, value, options, onChange, columns }: { name: Field; value: string; options: readonly Option[]; onChange: (key: Field, value: string) => void; columns: 3 | 4 | 5 }) {
  return (
    <div role="radiogroup" className={cn("grid gap-2", columns === 3 ? "grid-cols-3" : columns === 4 ? "grid-cols-4" : "grid-cols-5")}>
      {options.map(([option, title]) => (
        <button type="button" role="radio" aria-checked={value === option} key={option} onClick={() => onChange(name, option)} className={cn("flex min-h-14 items-center justify-center rounded-2xl bg-card px-2 text-center text-base leading-tight font-bold shadow-soft transition-colors dark:ring-1 dark:ring-white/5", value === option && "bg-primary text-primary-foreground shadow-glow dark:ring-primary")}>
          {title}
        </button>
      ))}
    </div>
  );
}

function UnitToggle<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (value: T) => void }) {
  return (
    <span className="inline-flex rounded-xl bg-muted p-0.5">
      {options.map((option) => (
        <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)} className={cn("min-h-8 rounded-[0.6rem] px-2.5 text-xs font-semibold text-muted-foreground", value === option && "bg-card text-foreground shadow-soft")}>
          {option}
        </button>
      ))}
    </span>
  );
}

function NumberField({ label, name, value, onChange, placeholder, min, max, unit, inputMode = "decimal", className }: { label: string; name: Field; value: string; onChange: (key: Field, value: string) => void; placeholder: string; min: number; max: number; unit?: React.ReactNode; inputMode?: "numeric" | "decimal"; className?: string }) {
  const id = `field-${name}`;
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex h-8 items-center justify-between gap-2"><Label htmlFor={id} className="text-sm font-semibold">{label}</Label>{unit}</div>
      <Input id={id} type="number" inputMode={inputMode} min={min} max={max} step={inputMode === "numeric" ? 1 : 0.1} value={value} onChange={(event) => onChange(name, event.target.value)} placeholder={placeholder} className="tabular h-14 text-lg font-semibold shadow-soft" />
    </div>
  );
}
