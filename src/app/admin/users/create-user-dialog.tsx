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
        render={<Button />}
      >
        <UserPlus className="h-4 w-4" />
        <span className="hidden sm:inline">Add user</span>
        <span className="sm:hidden">Add</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a user</DialogTitle>
        </DialogHeader>
        <form action={action} className="space-y-4">
          {state?.error && (
            <div role="alert" className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
              {state.error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Temporary password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
            />
            <p className="text-xs text-muted-foreground">
              At least 8 characters. They’ll be asked to change it when they first log in.
            </p>
          </div>
          <Button type="submit" disabled={pending} size="lg" className="w-full">
            {pending ? "Adding…" : "Add user"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
