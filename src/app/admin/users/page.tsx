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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <CreateUserDialog />
      </div>

      <UserTable users={allUsers} />
    </div>
  );
}
