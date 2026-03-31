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
import { Badge } from "@/components/ui/badge";
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

  async function handleDelete(userId: number) {
    if (!confirm("Are you sure you want to delete this user?")) return;
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

  return (
    <>
      <div className="surface rounded-2xl border-white/10 overflow-x-auto">
        <Table className="min-w-[540px]">
          <TableHeader>
            <TableRow className="border-white/10">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} className="border-white/5">
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Badge
                    variant={user.role === "admin" ? "default" : "secondary"}
                    className={
                      user.role === "admin"
                        ? "bg-primary text-primary-foreground border-0"
                        : ""
                    }
                  >
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.forcePasswordChange && (
                    <Badge variant="outline" className="border-amber-500/50 text-amber-500">
                      Pending password change
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {user.role !== "admin" && (
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-white/10"
                        onClick={() => {
                          setSelectedUserId(user.id);
                          setResetDialogOpen(true);
                        }}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg hover:bg-destructive/20 text-destructive"
                        onClick={() => handleDelete(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="surface border-white/10 rounded-2xl">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Temporary Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                className="h-11 rounded-xl bg-white/5 border-white/10"
              />
              <p className="text-xs text-muted-foreground">
                User will be forced to change this on next login
              </p>
            </div>
            <Button
              onClick={handleResetPassword}
              className="w-full bg-primary text-primary-foreground rounded-xl"
              disabled={newPassword.length < 8}
            >
              Reset Password
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
