"use client";

import { useActionState } from "react";
import { changePassword } from "@/lib/actions/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function ChangePasswordPage() {
  const [state, action, pending] = useActionState(changePassword, null);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/20">
            <ShieldAlert className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Update Your Password
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You must change your password before continuing
          </p>
        </div>

        <form action={action} className="surface rounded-2xl p-6 space-y-5">
          {state?.error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {state.error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              required
              className="h-12 rounded-xl bg-white/5 border-white/10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              required
              className="h-12 rounded-xl bg-white/5 border-white/10"
            />
            <p className="text-xs text-muted-foreground">
              Min 8 characters, at least one letter and one number
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              className="h-12 rounded-xl bg-white/5 border-white/10"
            />
          </div>

          <Button
            type="submit"
            disabled={pending}
            className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90"
          >
            {pending ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
