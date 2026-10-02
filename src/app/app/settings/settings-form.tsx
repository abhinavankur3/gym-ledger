"use client";

import { useState, useTransition } from "react";
import { updatePreferences, changePasswordFromSettings } from "./actions";
import { logout } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";
import { UserRound, Ruler, Palette, Lock, LogOut } from "lucide-react";
import { toast } from "sonner";

function SegmentedControl({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-2xl bg-muted p-1">
      {options.map((opt) => (
        <button
          type="button"
          role="radio"
          key={opt.value}
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "h-10 flex-1 rounded-xl px-3 text-sm font-semibold transition-colors",
            value === opt.value
              ? "bg-primary text-primary-foreground shadow-glow"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Section({ icon, tone, title, children }: { icon: React.ReactNode; tone: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-card p-5 shadow-soft dark:ring-1 dark:ring-white/5">
      <h2 className="flex items-center gap-3 font-display text-lg">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", tone)}>{icon}</span>
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

type Props = {
  initialName: string;
  initialWeightUnit: string;
  initialMeasurementUnit: string;
  initialTheme: string;
};

export function SettingsForm({ initialName, initialWeightUnit, initialMeasurementUnit, initialTheme }: Props) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [weightUnit, setWeightUnit] = useState(initialWeightUnit);
  const [measurementUnit, setMeasurementUnit] = useState(initialMeasurementUnit);
  const [theme, setTheme] = useState(initialTheme);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");

  function handleSavePrefs() {
    const formData = new FormData();
    if (name) formData.set("name", name);
    formData.set("weightUnit", weightUnit);
    formData.set("measurementUnit", measurementUnit);
    formData.set("theme", theme);

    startTransition(async () => {
      const result = await updatePreferences(formData);
      if (result?.success) toast.success("Settings saved");
    });
  }

  function handleChangePassword() {
    const formData = new FormData();
    formData.set("currentPassword", currentPw);
    formData.set("newPassword", newPw);

    startTransition(async () => {
      const result = await changePasswordFromSettings(formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Password changed");
        setCurrentPw("");
        setNewPw("");
      }
    });
  }

  return (
    <div className="pb-6">
      <PageHeader title="Settings" back={{ href: "/app/more", label: "More" }} hideProfile />

      <div className="space-y-3">
        <Section icon={<UserRound className="h-[18px] w-[18px]" />} tone="bg-pull/15 text-pull" title="Profile">
          <div className="space-y-2">
            <Label htmlFor="settings-name">Display name</Label>
            <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
        </Section>

        <Section icon={<Ruler className="h-[18px] w-[18px]" />} tone="bg-legs/15 text-legs" title="Units">
          <div className="space-y-2">
            <p className="text-sm font-medium">Weight</p>
            <SegmentedControl label="Weight unit" options={[{ label: "kg", value: "kg" }, { label: "lbs", value: "lbs" }]} value={weightUnit} onChange={setWeightUnit} />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Measurements</p>
            <SegmentedControl label="Measurement unit" options={[{ label: "cm", value: "cm" }, { label: "in", value: "in" }]} value={measurementUnit} onChange={setMeasurementUnit} />
          </div>
        </Section>

        <Section icon={<Palette className="h-[18px] w-[18px]" />} tone="bg-sun/20 text-ink dark:text-sun" title="Appearance">
          <SegmentedControl
            label="Theme"
            options={[{ label: "Light", value: "light" }, { label: "Dark", value: "dark" }, { label: "System", value: "system" }]}
            value={theme}
            onChange={setTheme}
          />
          <p className="text-xs text-muted-foreground">System follows your device setting.</p>
        </Section>

        <Button onClick={handleSavePrefs} disabled={pending} size="lg" className="w-full">
          {pending ? "Saving…" : "Save settings"}
        </Button>

        <div className="pt-5">
          <Section icon={<Lock className="h-[18px] w-[18px]" />} tone="bg-push/15 text-push" title="Password">
            <div className="space-y-2">
              <Label htmlFor="settings-current-pw">Current password</Label>
              <Input id="settings-current-pw" type="password" autoComplete="current-password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-new-pw">New password</Label>
              <Input id="settings-new-pw" type="password" autoComplete="new-password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            <Button onClick={handleChangePassword} disabled={pending || !currentPw || newPw.length < 8} variant="outline" className="w-full">
              Change password
            </Button>
          </Section>
        </div>

        <form action={logout} className="pt-3">
          <Button type="submit" variant="outline" size="lg" className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
        </form>

        <p className="pt-2 text-center text-xs text-muted-foreground">Gym Ledger v0.1.0</p>
      </div>
    </div>
  );
}
