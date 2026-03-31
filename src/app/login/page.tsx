"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dumbbell } from "lucide-react";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Dumbbell className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            GYM LEDGER
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Track your gains, own your progress
          </p>
        </div>

        <form action={action} className="surface rounded-2xl p-6 space-y-5">
          {state?.error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="h-12 rounded-xl bg-white/5 border-white/10 placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="h-12 rounded-xl bg-white/5 border-white/10 placeholder:text-muted-foreground/50"
            />
          </div>

          <Button
            type="submit"
            disabled={pending}
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
          >
            {pending ? "Signing in..." : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}
