import { requireAdmin } from "@/lib/auth/dal";
import { desc } from "drizzle-orm";
import db from "@/lib/db";
import { users } from "@/lib/db/schema";
import { CreateUserDialog } from "./create-user-dialog";
import { UserTable } from "./user-table";

export default async function AdminUsersPage() {
  // Layouts can be skipped on client navigation, so each admin page checks too
  await requireAdmin();
  // Only what the table shows: never send password hashes to the browser
  const allUsers = await db.query.users.findMany({
    columns: { id: true, email: true, name: true, role: true, forcePasswordChange: true, createdAt: true },
    orderBy: [desc(users.createdAt)],
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[2rem] md:text-[2.5rem]">Users</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{allUsers.length} {allUsers.length === 1 ? "account" : "accounts"}</p>
        </div>
        <CreateUserDialog />
      </div>

      <div className="mt-6">
        <UserTable users={allUsers} />
      </div>
    </div>
  );
}
