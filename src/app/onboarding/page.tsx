"use client";

import { useActionState, useState } from "react";
import { completeOnboarding } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Check, Dumbbell, Loader2 } from "lucide-react";

type Option = readonly [value: string, title: string, description?: string];

const steps = ["Goal", "Experience", "Schedule", "About you", "Preferences"];
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
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Dumbbell className="h-5 w-5" /></div>
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Gym Ledger</p><p className="text-sm text-muted-foreground">A plan that fits your life</p></div>
        </div>
        <div className="mb-8 flex items-center justify-between">
          <div><p className="text-sm font-semibold">Step {step + 1} of {steps.length}</p><h1 className="mt-1 text-3xl font-bold">{steps[step]}</h1></div>
          <div className="flex gap-1.5" aria-hidden>{steps.map((label, index) => <span key={label} className={cn("h-1.5 w-6 rounded-full bg-muted", index <= step && "bg-primary")} />)}</div>
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
                <Input id="restrictions" value={form.restrictions} onChange={(event) => update("restrictions", event.target.value)} maxLength={200} placeholder="Allergies, foods, or preferences" className="h-12 rounded-xl border-border bg-card" />
              </div>
            </div>
          )}

          {error && <p role="alert" className="mt-4 text-sm font-medium text-destructive">{error}</p>}

          <div className="mt-8 flex gap-3">
            <Button type="button" variant="outline" aria-label="Previous step" onClick={() => { setClientError(""); setStep((current) => Math.max(current - 1, 0)); }} disabled={step === 0 || pending} className="h-12 rounded-2xl px-4"><ArrowLeft className="h-4 w-4" /></Button>
            {isLast ? (
              <Button type="submit" disabled={pending} className="h-12 flex-1 rounded-2xl font-bold">{pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Building your plan…</> : <>Generate my plan <Check className="ml-2 h-4 w-4" /></>}</Button>
            ) : (
              <Button type="button" onClick={next} className="h-12 flex-1 rounded-2xl font-bold">Continue <ArrowRight className="ml-2 h-4 w-4" /></Button>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}

function GeneratingOverlay() {
  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-2xl shadow-black/40">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
        <p className="mt-5 text-xl font-bold">Building your plan</p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Matching exercises to your schedule and equipment. This can take up to a minute — keep this screen open.</p>
      </div>
    </div>
  );
}

function Question({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-bold">{label}</legend>
      {hint && <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </fieldset>
  );
}

function ChoiceGroup({ name, value, options, onChange }: { name: Field; value: string; options: readonly Option[]; onChange: (key: Field, value: string) => void }) {
  return (
    <div role="radiogroup" className="space-y-2">
      {options.map(([option, title, description]) => (
        <button type="button" role="radio" aria-checked={value === option} key={option} onClick={() => onChange(name, option)} className={cn("flex w-full items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50", value === option && "border-primary bg-primary/8 ring-1 ring-primary")}>
          <span><span className="block font-bold">{title}</span>{description && <span className="mt-1 block text-xs text-muted-foreground">{description}</span>}</span>
          <span className={cn("h-5 w-5 shrink-0 rounded-full border border-muted-foreground/40", value === option && "border-[6px] border-primary")} />
        </button>
      ))}
    </div>
  );
}

function ChipGroup({ name, value, options, onChange, columns }: { name: Field; value: string; options: readonly Option[]; onChange: (key: Field, value: string) => void; columns: 3 | 4 | 5 }) {
  return (
    <div role="radiogroup" className={cn("grid gap-2", columns === 3 ? "grid-cols-3" : columns === 4 ? "grid-cols-4" : "grid-cols-5")}>
      {options.map(([option, title]) => (
        <button type="button" role="radio" aria-checked={value === option} key={option} onClick={() => onChange(name, option)} className={cn("flex min-h-12 items-center justify-center rounded-2xl border border-border bg-card px-2 text-center text-sm leading-tight font-bold transition-colors hover:border-primary/50", value === option && "border-primary bg-primary/8 text-primary ring-1 ring-primary")}>
          {title}
        </button>
      ))}
    </div>
  );
}

function UnitToggle<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (value: T) => void }) {
  return (
    <span className="inline-flex rounded-lg bg-muted p-0.5">
      {options.map((option) => (
        <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)} className={cn("rounded-md px-2 py-0.5 text-xs font-semibold text-muted-foreground", value === option && "bg-background text-foreground")}>
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
      <div className="flex h-6 items-center justify-between gap-2"><Label htmlFor={id}>{label}</Label>{unit}</div>
      <Input id={id} type="number" inputMode={inputMode} min={min} max={max} step={inputMode === "numeric" ? 1 : 0.1} value={value} onChange={(event) => onChange(name, event.target.value)} placeholder={placeholder} className="h-12 rounded-xl border-border bg-card" />
    </div>
  );
}
