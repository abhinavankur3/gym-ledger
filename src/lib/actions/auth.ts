"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import db from "@/lib/db";
import { users, userPreferences } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { requireAdmin, verifySession } from "@/lib/auth/dal";
import { loginSchema, changePasswordSchema, createUserSchema } from "@/lib/validators/schemas";

export async function login(_prev: unknown, formData: FormData) {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Invalid email or password." };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  });

  if (!user) {
    return { error: "Invalid email or password." };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { error: "Invalid email or password." };
  }

  await createSession(user.id, user.role);

  if (user.forcePasswordChange) {
    redirect("/change-password");
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
  const session = await verifySession();

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

  await db
    .update(users)
    .set({
      passwordHash: newHash,
      forcePasswordChange: false,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, session.userId));

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
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, userId));

  revalidatePath("/admin/users");
  return { success: true };
}
