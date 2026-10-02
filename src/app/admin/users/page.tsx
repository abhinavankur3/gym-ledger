import { desc } from "drizzle-orm";
import db from "@/lib/db";
import { users } from "@/lib/db/schema";
import { CreateUserDialog } from "./create-user-dialog";
import { UserTable } from "./user-table";

export default async function AdminUsersPage() {
  const allUsers = await db.query.users.findMany({
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
