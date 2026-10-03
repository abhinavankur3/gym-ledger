"use server";

import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { users, userPreferences } from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/dal";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { setThemeCookie } from "@/lib/theme";

const preferencesSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  weightUnit: z.enum(["kg", "lbs"]).optional(),
  measurementUnit: z.enum(["cm", "in"]).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
});

export async function updatePreferences(formData: FormData) {
  const session = await verifySession();

  const field = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" && value.trim() ? value : undefined;
  };
  const parsed = preferencesSchema.safeParse({
    name: field("name"),
    weightUnit: field("weightUnit"),
    measurementUnit: field("measurementUnit"),
    theme: field("theme"),
  });
  if (!parsed.success) return { error: "Check your name (up to 60 characters) and choices, then save again." };
  const { name, weightUnit, measurementUnit, theme } = parsed.data;

  // Update user name
  if (name) {
    await db
      .update(users)
      .set({ name, updatedAt: new Date().toISOString() })
      .where(eq(users.id, session.userId));
  }

  // Upsert preferences
  const existing = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, session.userId),
  });

  if (existing) {
    await db
      .update(userPreferences)
      .set({
        weightUnit: weightUnit ?? existing.weightUnit,
        measurementUnit: measurementUnit ?? existing.measurementUnit,
        theme: theme ?? existing.theme,
      })
      .where(eq(userPreferences.userId, session.userId));
  } else {
    await db.insert(userPreferences).values({
      userId: session.userId,
      weightUnit: weightUnit ?? "kg",
      measurementUnit: measurementUnit ?? "cm",
      theme: theme ?? "dark",
    });
  }

  if (theme) await setThemeCookie(theme);

  revalidatePath("/", "layout");
  return { success: true };
}

export async function changePasswordFromSettings(formData: FormData) {
  const session = await verifySession();

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;

  if (!currentPassword || !newPassword) {
    return { error: "All fields are required." };
  }

  if (newPassword.length < 8 || newPassword.length > 200) {
    return { error: "New password must be at least 8 characters." };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });

  if (!user) return { error: "User not found." };

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) return { error: "Current password is incorrect." };

  const newHash = await hashPassword(newPassword);
  // Bumping the version signs out every other session; this one gets a fresh cookie
  const [updated] = await db
    .update(users)
    .set({ passwordHash: newHash, sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date().toISOString() })
    .where(eq(users.id, session.userId))
    .returning({ sessionVersion: users.sessionVersion });
  await createSession(user.id, user.role, updated.sessionVersion);

  return { success: true };
}
