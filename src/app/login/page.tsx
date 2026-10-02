"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { EquipmentArt } from "@/components/equipment-art";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-sm">
        {/* Splash block: brand on sun yellow with the equipment hanging over the edge */}
        <div className="relative h-44 overflow-hidden rounded-t-[2rem] bg-sun p-6 text-ink">
          <span aria-hidden className="pointer-events-none absolute -left-2 top-12 select-none whitespace-nowrap font-display text-[7rem] leading-none text-white/30">Train</span>
          <BrandMark className="relative h-12 w-12" />
        </div>
        <EquipmentArt kind="kettlebell" className="animate-hero-drop absolute right-2 top-16 z-10 w-32" />

        <form action={action} className="relative rounded-b-[2rem] bg-card p-6 pt-7 shadow-lift dark:ring-1 dark:ring-white/5">
          <h1 className="font-display text-[2.5rem]">Gym Ledger<span className="text-primary">.</span></h1>
          <p className="mt-2 text-muted-foreground">Your personal coach for training and nutrition. Sign in to pick up where you left off.</p>

          {state?.error && (
            <p role="alert" className="mt-5 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {state.error}
            </p>
          )}

          <div className="mt-6 space-y-2">
            <Label htmlFor="email" className="font-semibold">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" autoComplete="email" required />
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="password" className="font-semibold">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>

          <Button type="submit" size="lg" disabled={pending} className="mt-7 w-full">
            {pending ? <><Loader2 className="h-5 w-5 animate-spin" />Signing in…</> : "Sign in"}
          </Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">Accounts are created by your admin.</p>
        </form>
      </div>
    </main>
  );
}
