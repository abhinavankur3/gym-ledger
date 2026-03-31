"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { users, userPreferences } from "@/lib/db/schema";
import { verifySession } from "@/lib/auth/dal";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

export async function updatePreferences(formData: FormData) {
  const session = await verifySession();

  const weightUnit = formData.get("weightUnit") as string;
  const measurementUnit = formData.get("measurementUnit") as string;
  const theme = formData.get("theme") as string;
  const name = formData.get("name") as string;

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
        weightUnit: (weightUnit as "kg" | "lbs") || existing.weightUnit,
        measurementUnit: (measurementUnit as "cm" | "in") || existing.measurementUnit,
        theme: (theme as "light" | "dark" | "system") || existing.theme,
      })
      .where(eq(userPreferences.userId, session.userId));
  } else {
    await db.insert(userPreferences).values({
      userId: session.userId,
      weightUnit: (weightUnit as "kg" | "lbs") || "kg",
      measurementUnit: (measurementUnit as "cm" | "in") || "cm",
      theme: (theme as "light" | "dark" | "system") || "dark",
    });
  }

  revalidatePath("/app/settings");
  revalidatePath("/app");
  return { success: true };
}

export async function changePasswordFromSettings(formData: FormData) {
  const session = await verifySession();

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;

  if (!currentPassword || !newPassword) {
    return { error: "All fields are required." };
  }

  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });

  if (!user) return { error: "User not found." };

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) return { error: "Current password is incorrect." };

  const newHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash: newHash, updatedAt: new Date().toISOString() })
    .where(eq(users.id, session.userId));

  return { success: true };
}
