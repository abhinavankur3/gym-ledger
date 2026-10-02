import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-zA-Z]/, "Password must contain at least one letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const bodyMetricSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  metricType: z.string().min(1, "Metric type is required"),
  value: z.number().positive("Value must be positive"),
  unit: z.string().min(1, "Unit is required"),
  notes: z.string().optional(),
});

export const onboardingSchema = z.object({
  goal: z.enum(["lose_fat", "build_muscle", "recomposition", "general_fitness"]),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  age: z.number().int().min(13).max(100),
  sex: z.enum(["male", "female", "prefer_not_to_say"]),
  height: z.number().positive().max(300),
  weight: z.number().positive().max(500),
  activityLevel: z.enum(["sedentary", "light", "moderate", "very_active"]),
  trainingDays: z.number().int().min(2).max(6),
  sessionDuration: z.number().int().min(30).max(120),
  equipment: z.string().min(1),
  dietaryPreferences: z.string().min(1),
  restrictions: z.string().optional(),
});
