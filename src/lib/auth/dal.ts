import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { eq } from "drizzle-orm";
import db from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSession } from "./session";

/**
 * Validates the session cookie against the database: the user must still exist and
 * the token's sessionVersion must match (password changes and resets bump it, which
 * revokes older sessions). The role comes from the database, not the token.
 */
const loadSession = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
    columns: { id: true, role: true, sessionVersion: true, forcePasswordChange: true },
  });
  if (!user || (session.sessionVersion ?? 0) !== user.sessionVersion) redirect("/login");
  return { session: { ...session, role: user.role }, user };
});

/** For the change-password flow only: a valid session, even if a password change is pending. */
export const verifySessionAllowingPasswordChange = cache(async () => {
  return (await loadSession()).session;
});

/** Every other page and server action: valid session and no pending forced password change. */
export const verifySession = cache(async () => {
  const { session, user } = await loadSession();
  if (user.forcePasswordChange) redirect("/change-password");
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
