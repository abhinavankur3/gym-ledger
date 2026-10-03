import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
  forcePasswordChange: integer("force_password_change", { mode: "boolean" }).notNull().default(true),
  /** Bumped on password change/reset; sessions carrying an older version are rejected */
  sessionVersion: integer("session_version").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const exercises = sqliteTable("exercises", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  category: text("category", {
    enum: ["barbell", "dumbbell", "machine", "cable", "bodyweight", "cardio", "other"],
  }).notNull(),
  primaryMuscleGroup: text("primary_muscle_group").notNull(),
  secondaryMuscleGroups: text("secondary_muscle_groups"), // JSON array as text
  isCustom: integer("is_custom", { mode: "boolean" }).notNull().default(false),
  createdByUserId: integer("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
});

export const gymAttendance = sqliteTable(
  "gym_attendance",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    checkIn: text("check_in").notNull(),
    checkOut: text("check_out"),
    notes: text("notes"),
  },
  (table) => [
    index("idx_attendance_user_checkin").on(table.userId, table.checkIn),
  ]
);

export const workoutTemplates = sqliteTable("workout_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const workoutTemplateExercises = sqliteTable(
  "workout_template_exercises",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    templateId: integer("template_id").notNull().references(() => workoutTemplates.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id").notNull().references(() => exercises.id),
    orderIndex: integer("order_index").notNull(),
    targetSets: integer("target_sets"),
    targetReps: text("target_reps"), // e.g., "8-12"
    targetWeight: real("target_weight"),
  },
  (table) => [index("idx_template_exercises_template").on(table.templateId)]
);

export const workouts = sqliteTable(
  "workouts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    templateId: integer("template_id").references(() => workoutTemplates.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    startedAt: text("started_at").notNull(),
    completedAt: text("completed_at"),
    notes: text("notes"),
  },
  (table) => [
    index("idx_workouts_user_started").on(table.userId, table.startedAt),
  ]
);

export const workoutSets = sqliteTable(
  "workout_sets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    workoutId: integer("workout_id").notNull().references(() => workouts.id, { onDelete: "cascade" }),
    exerciseId: integer("exercise_id").notNull().references(() => exercises.id),
    setNumber: integer("set_number").notNull(),
    setType: text("set_type", {
      enum: ["warmup", "working", "dropset", "failure"],
    }).notNull().default("working"),
    reps: integer("reps"),
    weight: real("weight"),
    durationSeconds: integer("duration_seconds"),
    rpe: real("rpe"),
    isPr: integer("is_pr", { mode: "boolean" }).notNull().default(false),
    completedAt: text("completed_at").notNull(),
  },
  (table) => [
    index("idx_sets_workout_exercise").on(table.workoutId, table.exerciseId),
    // PR checks and last-performance lookups filter by exercise across workouts
    index("idx_sets_exercise").on(table.exerciseId),
  ]
);

export const bodyMetrics = sqliteTable(
  "body_metrics",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD
    metricType: text("metric_type").notNull(),
    value: real("value").notNull(),
    unit: text("unit").notNull(),
    notes: text("notes"),
  },
  (table) => [
    index("idx_metrics_user_date_type").on(table.userId, table.date, table.metricType),
  ]
);

export const userPreferences = sqliteTable("user_preferences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  weightUnit: text("weight_unit", { enum: ["kg", "lbs"] }).notNull().default("kg"),
  measurementUnit: text("measurement_unit", { enum: ["cm", "in"] }).notNull().default("cm"),
  theme: text("theme", { enum: ["light", "dark", "system"] }).notNull().default("dark"),
});

export const userProfiles = sqliteTable("user_profiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  goal: text("goal", { enum: ["lose_fat", "build_muscle", "recomposition", "general_fitness"] }).notNull(),
  experience: text("experience", { enum: ["beginner", "intermediate", "advanced"] }).notNull(),
  age: integer("age").notNull(),
  sex: text("sex").notNull(),
  height: real("height").notNull(),
  weight: real("weight").notNull(),
  activityLevel: text("activity_level", { enum: ["sedentary", "light", "moderate", "very_active"] }).notNull(),
  trainingDays: integer("training_days").notNull(),
  sessionDuration: integer("session_duration").notNull(),
  equipment: text("equipment").notNull(),
  dietaryPreferences: text("dietary_preferences").notNull().default("none"),
  /** Foods to avoid (allergies, dislikes). Untrusted free text. */
  restrictions: text("restrictions"),
  /** Movements, injuries or constraints to avoid in training. Untrusted free text. */
  avoidMovements: text("avoid_movements"),
  /** Optional sub-regional cuisine (India): north | south | east | west. Null = mixed. */
  cuisineRegion: text("cuisine_region"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const planDrafts = sqliteTable("plan_drafts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  planJson: text("plan_json").notNull(),
  feedback: text("feedback"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const routines = sqliteTable(
  "routines",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
  },
  (table) => [index("idx_routines_user_active").on(table.userId, table.isActive)]
);

export const routineDays = sqliteTable(
  "routine_days",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    routineId: integer("routine_id").notNull().references(() => routines.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(), // 0=Monday ... 6=Sunday
    templateId: integer("template_id").notNull().references(() => workoutTemplates.id, { onDelete: "cascade" }),
  },
  (table) => [index("idx_routine_days_routine").on(table.routineId)]
);

// Drizzle relations for relational query builder
export const workoutTemplatesRelations = relations(workoutTemplates, ({ many, one }) => ({
  user: one(users, { fields: [workoutTemplates.userId], references: [users.id] }),
  exercises: many(workoutTemplateExercises),
}));

export const workoutTemplateExercisesRelations = relations(workoutTemplateExercises, ({ one }) => ({
  template: one(workoutTemplates, { fields: [workoutTemplateExercises.templateId], references: [workoutTemplates.id] }),
  exercise: one(exercises, { fields: [workoutTemplateExercises.exerciseId], references: [exercises.id] }),
}));

export const routinesRelations = relations(routines, ({ many, one }) => ({
  user: one(users, { fields: [routines.userId], references: [users.id] }),
  days: many(routineDays),
}));

export const routineDaysRelations = relations(routineDays, ({ one }) => ({
  routine: one(routines, { fields: [routineDays.routineId], references: [routines.id] }),
  template: one(workoutTemplates, { fields: [routineDays.templateId], references: [workoutTemplates.id] }),
}));

/** Meal plans: one draft (under review) and one active plan per user; older ones archived. */
export const nutritionPlans = sqliteTable(
  "nutrition_plans",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: text("status", { enum: ["draft", "active", "archived"] }).notNull(),
    planJson: text("plan_json").notNull(),
    /** Targets the plan was built for, so later target changes are visible */
    targetsJson: text("targets_json").notNull(),
    /** Where the plan came from: the model, or the offline fallback */
    source: text("source", { enum: ["ai", "fallback"] }).notNull(),
    cuisine: text("cuisine").notNull(),
    feedback: text("feedback"),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
    updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
  },
  (table) => [index("idx_nutrition_plans_user_status").on(table.userId, table.status)]
);

/**
 * What the user actually ate. Totals are stored so history doesn't depend on the
 * plan still existing; items keep the per-serving numbers and servings eaten.
 * Photos are not stored — only the estimate the user confirmed.
 */
export const mealLogs = sqliteTable(
  "meal_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** Local date YYYY-MM-DD in the user's time zone */
    date: text("date").notNull(),
    slot: text("slot", { enum: ["breakfast", "lunch", "snack", "dinner"] }).notNull(),
    source: text("source", { enum: ["plan", "photo", "text"] }).notNull(),
    title: text("title").notNull(),
    itemsJson: text("items_json").notNull(),
    kcal: real("kcal").notNull(),
    protein: real("protein").notNull(),
    carbs: real("carbs").notNull(),
    fat: real("fat").notNull(),
    /** Plan meals: the share of the planned portion eaten (0.5 = half) */
    portion: real("portion"),
    createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  },
  (table) => [index("idx_meal_logs_user_date").on(table.userId, table.date)]
);

/** AI calls per user, for daily quotas (plan generation, meal plans, food estimates). */
export const aiUsage = sqliteTable(
  "ai_usage",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["workout_plan", "meal_plan", "food_estimate"] }).notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_ai_usage_user_kind_created").on(table.userId, table.kind, table.createdAt)]
);
