import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { eq } from "drizzle-orm";
import db from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSession } from "./session";

export const verifySession = cache(async () => {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
});

export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });
  if (!user) {
    redirect("/login");
  }
  return user;
});

export async function requireAdmin() {
  const session = await verifySession();
  if (session.role !== "admin") {
    redirect("/app");
  }
  return session;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (user.forcePasswordChange) {
    redirect("/change-password");
  }
  return user;
}
