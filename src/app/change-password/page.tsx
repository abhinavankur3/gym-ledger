"use client";

import { useActionState } from "react";
import { changePassword } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { KeyRound, Loader2 } from "lucide-react";

export default function ChangePasswordPage() {
  const [state, action, pending] = useActionState(changePassword, null);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="relative h-36 overflow-hidden rounded-t-[2rem] bg-pull p-6 text-ink">
          <span aria-hidden className="pointer-events-none absolute -left-2 top-10 select-none whitespace-nowrap font-display text-[6.5rem] leading-none text-white/30">Secure</span>
          <div className="relative flex items-center justify-between">
            <BrandMark className="h-11 w-11" />
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/30"><KeyRound className="h-5 w-5" /></span>
          </div>
        </div>

        <form action={action} className="rounded-b-[2rem] bg-card p-6 pt-7 shadow-lift dark:ring-1 dark:ring-white/5">
          <h1 className="font-display text-[2.25rem]">New password<span className="text-primary">.</span></h1>
          <p className="mt-2 text-muted-foreground">Choose your own password before you continue. Your admin set a temporary one.</p>

          {state?.error && (
            <p role="alert" className="mt-5 rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {state.error}
            </p>
          )}

          <div className="mt-6 space-y-2">
            <Label htmlFor="currentPassword" className="font-semibold">Current password</Label>
            <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="newPassword" className="font-semibold">New password</Label>
            <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" aria-describedby="newPassword-hint" required />
            <p id="newPassword-hint" className="text-xs text-muted-foreground">At least 8 characters, with a letter and a number.</p>
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="confirmPassword" className="font-semibold">Confirm new password</Label>
            <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
          </div>

          <Button type="submit" size="lg" disabled={pending} className="mt-7 w-full">
            {pending ? <><Loader2 className="h-5 w-5 animate-spin" />Updating…</> : "Update password"}
          </Button>
        </form>
      </div>
    </main>
  );
}
