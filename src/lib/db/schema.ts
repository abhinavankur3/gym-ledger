import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "user"] }).notNull().default("user"),
  forcePasswordChange: integer("force_password_change", { mode: "boolean" }).notNull().default(true),
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

export const workoutTemplateExercises = sqliteTable("workout_template_exercises", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  templateId: integer("template_id").notNull().references(() => workoutTemplates.id, { onDelete: "cascade" }),
  exerciseId: integer("exercise_id").notNull().references(() => exercises.id),
  orderIndex: integer("order_index").notNull(),
  targetSets: integer("target_sets"),
  targetReps: text("target_reps"), // e.g., "8-12"
  targetWeight: real("target_weight"),
});

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

export const routines = sqliteTable("routines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const routineDays = sqliteTable("routine_days", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  routineId: integer("routine_id").notNull().references(() => routines.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Monday ... 6=Sunday
  templateId: integer("template_id").notNull().references(() => workoutTemplates.id, { onDelete: "cascade" }),
});

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
