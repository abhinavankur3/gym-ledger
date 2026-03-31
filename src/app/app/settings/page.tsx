"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updatePreferences, changePasswordFromSettings } from "./actions";
import { logout } from "@/lib/actions/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BlurFade } from "@/components/ui/blur-fade";
import { cn } from "@/lib/utils";
import { User, Ruler, Palette, Lock, LogOut } from "lucide-react";
import { toast } from "sonner";

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-xl bg-white/5 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all",
            value === opt.value
              ? "bg-primary text-primary-foreground shadow"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [weightUnit, setWeightUnit] = useState("kg");
  const [measurementUnit, setMeasurementUnit] = useState("cm");
  const [theme, setTheme] = useState("dark");
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
      if (result?.success) toast.success("Settings saved!");
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
        toast.success("Password changed!");
        setCurrentPw("");
        setNewPw("");
      }
    });
  }

  return (
    <div className="px-4 pt-8">
      <BlurFade delay={0}>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </BlurFade>

      <div className="mt-4 space-y-4">
        {/* Profile */}
        <BlurFade delay={0.1}>
          <Card className="surface border-white/10 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Display Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="h-11 rounded-xl bg-white/5 border-white/10"
                />
              </div>
            </CardContent>
          </Card>
        </BlurFade>

        {/* Units */}
        <BlurFade delay={0.15}>
          <Card className="surface border-white/10 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Ruler className="h-4 w-4 text-primary" />
                Units
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs">Weight</Label>
                <SegmentedControl
                  options={[
                    { label: "kg", value: "kg" },
                    { label: "lbs", value: "lbs" },
                  ]}
                  value={weightUnit}
                  onChange={setWeightUnit}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Measurements</Label>
                <SegmentedControl
                  options={[
                    { label: "cm", value: "cm" },
                    { label: "in", value: "in" },
                  ]}
                  value={measurementUnit}
                  onChange={setMeasurementUnit}
                />
              </div>
            </CardContent>
          </Card>
        </BlurFade>

        {/* Theme */}
        <BlurFade delay={0.2}>
          <Card className="surface border-white/10 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Palette className="h-4 w-4 text-primary" />
                Theme
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SegmentedControl
                options={[
                  { label: "Light", value: "light" },
                  { label: "Dark", value: "dark" },
                  { label: "System", value: "system" },
                ]}
                value={theme}
                onChange={setTheme}
              />
            </CardContent>
          </Card>
        </BlurFade>

        <BlurFade delay={0.25}>
          <Button
            onClick={handleSavePrefs}
            disabled={pending}
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
          >
            Save Preferences
          </Button>
        </BlurFade>

        <Separator className="bg-white/10" />

        {/* Change Password */}
        <BlurFade delay={0.3}>
          <Card className="surface border-white/10 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-4 w-4 text-amber-400" />
                Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="password"
                placeholder="Current password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="h-11 rounded-xl bg-white/5 border-white/10"
              />
              <Input
                type="password"
                placeholder="New password (min 8 chars)"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="h-11 rounded-xl bg-white/5 border-white/10"
              />
              <Button
                onClick={handleChangePassword}
                disabled={pending || !currentPw || newPw.length < 8}
                variant="outline"
                className="w-full rounded-xl border-white/10"
              >
                Update Password
              </Button>
            </CardContent>
          </Card>
        </BlurFade>

        {/* Logout */}
        <BlurFade delay={0.35}>
          <form action={logout}>
            <Button
              type="submit"
              variant="outline"
              className="w-full h-12 rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Log Out
            </Button>
          </form>
        </BlurFade>

        <p className="text-center text-xs text-muted-foreground pb-4">
          Gym Ledger v0.1.0
        </p>
      </div>
    </div>
  );
}
