"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import db from "@/lib/db";
import { users, userPreferences, userProfiles } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { requireAdmin, verifySessionAllowingPasswordChange } from "@/lib/auth/dal";
import { setThemeCookie } from "@/lib/theme";
import { loginSchema, changePasswordSchema, createUserSchema } from "@/lib/validators/schemas";

/**
 * Constant bcrypt hash compared when the email isn't found, so a wrong email takes
 * as long as a wrong password and response time doesn't reveal which emails exist.
 */
const DUMMY_HASH = "$2b$12$7w6bvtP9mm.Cyy8GXYZgoeI3Q9i/GW4gJUvftvrSXPD2/iNBIhOi.";

/** Failed logins per email+IP in this process; a single-container app, so memory is enough. */
const MAX_FAILED_LOGINS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const failedLogins = new Map<string, number[]>();

function recentFailures(key: string, now: number) {
  const recent = (failedLogins.get(key) ?? []).filter((t) => now - t < LOGIN_WINDOW_MS);
  if (recent.length) failedLogins.set(key, recent);
  else failedLogins.delete(key);
  return recent;
}

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export async function login(_prev: unknown, formData: FormData) {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Invalid email or password." };
  }

  const now = Date.now();
  const limitKey = `${parsed.data.email.toLowerCase()}|${await clientIp()}`;
  if (recentFailures(limitKey, now).length >= MAX_FAILED_LOGINS) {
    return { error: "Too many failed attempts. Wait 15 minutes and try again." };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  });

  const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    failedLogins.set(limitKey, [...recentFailures(limitKey, now), now]);
    return { error: "Invalid email or password." };
  }
  failedLogins.delete(limitKey);

  await createSession(user.id, user.role, user.sessionVersion);

  const prefs = await db.query.userPreferences.findFirst({ where: eq(userPreferences.userId, user.id) });
  if (prefs?.theme) await setThemeCookie(prefs.theme);

  if (user.forcePasswordChange) {
    redirect("/change-password");
  }

  if (user.role === "user") {
    const profile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, user.id),
    });
    if (!profile) redirect("/onboarding");
  }

  if (user.role === "admin") {
    redirect("/admin");
  }

  redirect("/app");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

export async function changePassword(_prev: unknown, formData: FormData) {
  const session = await verifySessionAllowingPasswordChange();

  const raw = {
    currentPassword: formData.get("currentPassword") as string,
    newPassword: formData.get("newPassword") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const parsed = changePasswordSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const firstError =
      errors.currentPassword?.[0] ||
      errors.newPassword?.[0] ||
      errors.confirmPassword?.[0] ||
      "Invalid input.";
    return { error: firstError };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });

  if (!user) {
    return { error: "User not found." };
  }

  const valid = await verifyPassword(
    parsed.data.currentPassword,
    user.passwordHash
  );
  if (!valid) {
    return { error: "Current password is incorrect." };
  }

  const newHash = await hashPassword(parsed.data.newPassword);

  // Bumping the version signs out every other session; this one gets a fresh cookie
  const [updated] = await db
    .update(users)
    .set({
      passwordHash: newHash,
      forcePasswordChange: false,
      sessionVersion: sql`${users.sessionVersion} + 1`,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, session.userId))
    .returning({ sessionVersion: users.sessionVersion });
  await createSession(user.id, user.role, updated.sessionVersion);

  redirect("/app");
}

export async function createUser(_prev: unknown, formData: FormData) {
  await requireAdmin();

  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = createUserSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const firstError =
      errors.name?.[0] || errors.email?.[0] || errors.password?.[0] || "Invalid input.";
    return { error: firstError };
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  });

  if (existing) {
    return { error: "A user with this email already exists." };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const result = await db.insert(users).values({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
    role: "user",
    forcePasswordChange: true,
  }).returning({ id: users.id });

  // Create default preferences for the new user
  await db.insert(userPreferences).values({
    userId: result[0].id,
  });

  revalidatePath("/admin/users");
  return { success: true };
}

export async function deleteUser(userId: number) {
  await requireAdmin();

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return { error: "User not found." };
  }

  if (user.role === "admin") {
    return { error: "Cannot delete admin user." };
  }

  await db.delete(users).where(eq(users.id, userId));
  revalidatePath("/admin/users");
  return { success: true };
}

export async function resetUserPassword(userId: number, newPassword: string) {
  await requireAdmin();

  if (newPassword.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const passwordHash = await hashPassword(newPassword);

  await db
    .update(users)
    .set({
      passwordHash,
      forcePasswordChange: true,
      // Signs the user out everywhere, e.g. when an account is compromised
      sessionVersion: sql`${users.sessionVersion} + 1`,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, userId));

  revalidatePath("/admin/users");
  return { success: true };
}
