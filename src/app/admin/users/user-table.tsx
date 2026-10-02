"use client";

import { useState } from "react";
import { deleteUser, resetUserPassword } from "@/lib/actions/auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";

type User = {
  id: number;
  email: string;
  name: string;
  role: "admin" | "user";
  forcePasswordChange: boolean;
  createdAt: string;
};

export function UserTable({ users }: { users: User[] }) {
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const [deleteUserId, setDeleteUserId] = useState<number | null>(null);

  async function handleDelete(userId: number) {
    const result = await deleteUser(userId);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("User deleted");
    }
  }

  async function handleResetPassword() {
    if (!selectedUserId || !newPassword) return;
    const result = await resetUserPassword(selectedUserId, newPassword);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Password reset successfully");
      setResetDialogOpen(false);
      setNewPassword("");
    }
  }

  function openReset(userId: number) {
    setSelectedUserId(userId);
    setResetDialogOpen(true);
  }

  return (
    <>
      {/* Mobile: one card per user */}
      <ul className="space-y-3 md:hidden">
        {users.map((user) => (
          <li key={user.id} className="rounded-3xl bg-card p-4 shadow-soft dark:ring-1 dark:ring-white/5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-muted font-display text-lg">{user.name.slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{user.name}</p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <RoleBadge role={user.role} />
                  {user.forcePasswordChange && <PendingBadge />}
                </div>
              </div>
              {user.role !== "admin" && <UserActions name={user.name} onReset={() => openReset(user.id)} onDelete={() => setDeleteUserId(user.id)} />}
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-3xl bg-card shadow-soft md:block dark:ring-1 dark:ring-white/5">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="h-12 pl-5">Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="pr-5 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className="border-border">
                <TableCell className="py-3 pl-5 font-semibold">{user.name}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell><RoleBadge role={user.role} /></TableCell>
                <TableCell>{user.forcePasswordChange && <PendingBadge />}</TableCell>
                <TableCell className="pr-5 text-right">
                  {user.role !== "admin" && <UserActions name={user.name} onReset={() => openReset(user.id)} onDelete={() => setDeleteUserId(user.id)} />}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-password">New temporary password</Label>
              <Input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
              />
              <p className="text-xs text-muted-foreground">
                At least 8 characters. They’ll be asked to change it when they next log in.
              </p>
            </div>
            <Button onClick={handleResetPassword} size="lg" className="w-full" disabled={newPassword.length < 8}>
              Reset password
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteUserId !== null}
        onOpenChange={(open) => !open && setDeleteUserId(null)}
        title="Delete this user?"
        description="This cannot be undone."
        confirmLabel="Delete user"
        destructive
        onConfirm={() => deleteUserId !== null && handleDelete(deleteUserId)}
      />
    </>
  );
}

function RoleBadge({ role }: { role: User["role"] }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold", role === "admin" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
      {role === "admin" ? "Admin" : "Member"}
    </span>
  );
}

function PendingBadge() {
  return <span className="inline-flex h-6 items-center rounded-full bg-sun/25 px-2.5 text-xs font-semibold text-ink dark:text-sun">Must change password</span>;
}

function UserActions({ name, onReset, onDelete }: { name: string; onReset: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 justify-end gap-1">
      <Button variant="ghost" size="icon" aria-label={`Reset password for ${name}`} onClick={onReset}>
        <KeyRound className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" aria-label={`Delete ${name}`} className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
