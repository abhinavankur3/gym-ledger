"use client";

import { useActionState, useState } from "react";
import { createUser } from "@/lib/actions/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    async (prev: unknown, formData: FormData) => {
      const result = await createUser(prev, formData);
      if (result?.success) {
        setOpen(false);
      }
      return result;
    },
    null
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button className="bg-primary text-primary-foreground rounded-xl gap-2" />}
      >
        <UserPlus className="h-4 w-4" />
        Create User
      </DialogTrigger>
      <DialogContent className="surface border-white/10 rounded-2xl">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          {state?.error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
              {state.error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              required
              className="h-11 rounded-xl bg-white/5 border-white/10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              className="h-11 rounded-xl bg-white/5 border-white/10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Temporary Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="h-11 rounded-xl bg-white/5 border-white/10"
            />
            <p className="text-xs text-muted-foreground">
              User will be forced to change this on first login
            </p>
          </div>
          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-primary text-primary-foreground rounded-xl"
          >
            {pending ? "Creating..." : "Create User"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
