import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { hash } from "bcryptjs";
import * as schema from "./schema";

const db = drizzle({
  connection: {
    url: process.env.DATABASE_URL || "file:./data/gym-ledger.db",
  },
  schema,
});

const EXERCISES = [
  // Chest (10)
  { name: "Barbell Bench Press", category: "barbell", primaryMuscleGroup: "chest", secondaryMuscleGroups: '["triceps","shoulders"]' },
  { name: "Incline Barbell Bench Press", category: "barbell", primaryMuscleGroup: "chest", secondaryMuscleGroups: '["triceps","shoulders"]' },
  { name: "Dumbbell Bench Press", category: "dumbbell", primaryMuscleGroup: "chest", secondaryMuscleGroups: '["triceps","shoulders"]' },
  { name: "Incline Dumbbell Bench Press", category: "dumbbell", primaryMuscleGroup: "chest", secondaryMuscleGroups: '["triceps","shoulders"]' },
  { name: "Dumbbell Fly", category: "dumbbell", primaryMuscleGroup: "chest", secondaryMuscleGroups: '["shoulders"]' },
  { name: "Cable Fly", category: "cable", primaryMuscleGroup: "chest", secondaryMuscleGroups: '["shoulders"]' },
  { name: "Machine Chest Press", category: "machine", primaryMuscleGroup: "chest", secondaryMuscleGroups: '["triceps","shoulders"]' },
  { name: "Pec Deck", category: "machine", primaryMuscleGroup: "chest", secondaryMuscleGroups: '[]' },
  { name: "Push-Up", category: "bodyweight", primaryMuscleGroup: "chest", secondaryMuscleGroups: '["triceps","shoulders","core"]' },
  { name: "Dips (Chest)", category: "bodyweight", primaryMuscleGroup: "chest", secondaryMuscleGroups: '["triceps","shoulders"]' },

  // Back (10)
  { name: "Barbell Row", category: "barbell", primaryMuscleGroup: "back", secondaryMuscleGroups: '["biceps","forearms"]' },
  { name: "Deadlift", category: "barbell", primaryMuscleGroup: "back", secondaryMuscleGroups: '["hamstrings","glutes","forearms","core"]' },
  { name: "Pull-Up", category: "bodyweight", primaryMuscleGroup: "back", secondaryMuscleGroups: '["biceps","forearms"]' },
  { name: "Chin-Up", category: "bodyweight", primaryMuscleGroup: "back", secondaryMuscleGroups: '["biceps"]' },
  { name: "Lat Pulldown", category: "cable", primaryMuscleGroup: "back", secondaryMuscleGroups: '["biceps"]' },
  { name: "Seated Cable Row", category: "cable", primaryMuscleGroup: "back", secondaryMuscleGroups: '["biceps","forearms"]' },
  { name: "Dumbbell Row", category: "dumbbell", primaryMuscleGroup: "back", secondaryMuscleGroups: '["biceps","forearms"]' },
  { name: "T-Bar Row", category: "barbell", primaryMuscleGroup: "back", secondaryMuscleGroups: '["biceps","forearms"]' },
  { name: "Face Pull", category: "cable", primaryMuscleGroup: "back", secondaryMuscleGroups: '["shoulders"]' },
  { name: "Machine Row", category: "machine", primaryMuscleGroup: "back", secondaryMuscleGroups: '["biceps"]' },

  // Shoulders (8)
  { name: "Overhead Press", category: "barbell", primaryMuscleGroup: "shoulders", secondaryMuscleGroups: '["triceps"]' },
  { name: "Dumbbell Shoulder Press", category: "dumbbell", primaryMuscleGroup: "shoulders", secondaryMuscleGroups: '["triceps"]' },
  { name: "Lateral Raise", category: "dumbbell", primaryMuscleGroup: "shoulders", secondaryMuscleGroups: '[]' },
  { name: "Front Raise", category: "dumbbell", primaryMuscleGroup: "shoulders", secondaryMuscleGroups: '[]' },
  { name: "Reverse Fly", category: "dumbbell", primaryMuscleGroup: "shoulders", secondaryMuscleGroups: '["back"]' },
  { name: "Arnold Press", category: "dumbbell", primaryMuscleGroup: "shoulders", secondaryMuscleGroups: '["triceps"]' },
  { name: "Cable Lateral Raise", category: "cable", primaryMuscleGroup: "shoulders", secondaryMuscleGroups: '[]' },
  { name: "Machine Shoulder Press", category: "machine", primaryMuscleGroup: "shoulders", secondaryMuscleGroups: '["triceps"]' },

  // Biceps (6)
  { name: "Barbell Curl", category: "barbell", primaryMuscleGroup: "biceps", secondaryMuscleGroups: '["forearms"]' },
  { name: "Dumbbell Curl", category: "dumbbell", primaryMuscleGroup: "biceps", secondaryMuscleGroups: '["forearms"]' },
  { name: "Hammer Curl", category: "dumbbell", primaryMuscleGroup: "biceps", secondaryMuscleGroups: '["forearms"]' },
  { name: "Preacher Curl", category: "barbell", primaryMuscleGroup: "biceps", secondaryMuscleGroups: '["forearms"]' },
  { name: "Cable Curl", category: "cable", primaryMuscleGroup: "biceps", secondaryMuscleGroups: '["forearms"]' },
  { name: "Incline Dumbbell Curl", category: "dumbbell", primaryMuscleGroup: "biceps", secondaryMuscleGroups: '[]' },

  // Triceps (6)
  { name: "Tricep Pushdown", category: "cable", primaryMuscleGroup: "triceps", secondaryMuscleGroups: '[]' },
  { name: "Overhead Tricep Extension", category: "dumbbell", primaryMuscleGroup: "triceps", secondaryMuscleGroups: '[]' },
  { name: "Skull Crusher", category: "barbell", primaryMuscleGroup: "triceps", secondaryMuscleGroups: '[]' },
  { name: "Dips (Tricep)", category: "bodyweight", primaryMuscleGroup: "triceps", secondaryMuscleGroups: '["chest","shoulders"]' },
  { name: "Cable Overhead Extension", category: "cable", primaryMuscleGroup: "triceps", secondaryMuscleGroups: '[]' },
  { name: "Close-Grip Bench Press", category: "barbell", primaryMuscleGroup: "triceps", secondaryMuscleGroups: '["chest","shoulders"]' },

  // Quads (8)
  { name: "Barbell Squat", category: "barbell", primaryMuscleGroup: "quads", secondaryMuscleGroups: '["glutes","hamstrings","core"]' },
  { name: "Front Squat", category: "barbell", primaryMuscleGroup: "quads", secondaryMuscleGroups: '["glutes","core"]' },
  { name: "Leg Press", category: "machine", primaryMuscleGroup: "quads", secondaryMuscleGroups: '["glutes"]' },
  { name: "Leg Extension", category: "machine", primaryMuscleGroup: "quads", secondaryMuscleGroups: '[]' },
  { name: "Goblet Squat", category: "dumbbell", primaryMuscleGroup: "quads", secondaryMuscleGroups: '["glutes","core"]' },
  { name: "Hack Squat", category: "machine", primaryMuscleGroup: "quads", secondaryMuscleGroups: '["glutes"]' },
  { name: "Bulgarian Split Squat", category: "dumbbell", primaryMuscleGroup: "quads", secondaryMuscleGroups: '["glutes","hamstrings"]' },
  { name: "Walking Lunge", category: "dumbbell", primaryMuscleGroup: "quads", secondaryMuscleGroups: '["glutes","hamstrings"]' },

  // Hamstrings (5)
  { name: "Romanian Deadlift", category: "barbell", primaryMuscleGroup: "hamstrings", secondaryMuscleGroups: '["glutes","back"]' },
  { name: "Leg Curl", category: "machine", primaryMuscleGroup: "hamstrings", secondaryMuscleGroups: '[]' },
  { name: "Seated Leg Curl", category: "machine", primaryMuscleGroup: "hamstrings", secondaryMuscleGroups: '[]' },
  { name: "Stiff-Leg Deadlift", category: "barbell", primaryMuscleGroup: "hamstrings", secondaryMuscleGroups: '["glutes","back"]' },
  { name: "Nordic Hamstring Curl", category: "bodyweight", primaryMuscleGroup: "hamstrings", secondaryMuscleGroups: '[]' },

  // Glutes (4)
  { name: "Hip Thrust", category: "barbell", primaryMuscleGroup: "glutes", secondaryMuscleGroups: '["hamstrings"]' },
  { name: "Cable Pull-Through", category: "cable", primaryMuscleGroup: "glutes", secondaryMuscleGroups: '["hamstrings"]' },
  { name: "Glute Bridge", category: "bodyweight", primaryMuscleGroup: "glutes", secondaryMuscleGroups: '["hamstrings"]' },
  { name: "Cable Kickback", category: "cable", primaryMuscleGroup: "glutes", secondaryMuscleGroups: '[]' },

  // Calves (3)
  { name: "Standing Calf Raise", category: "machine", primaryMuscleGroup: "calves", secondaryMuscleGroups: '[]' },
  { name: "Seated Calf Raise", category: "machine", primaryMuscleGroup: "calves", secondaryMuscleGroups: '[]' },
  { name: "Donkey Calf Raise", category: "machine", primaryMuscleGroup: "calves", secondaryMuscleGroups: '[]' },

  // Core (8)
  { name: "Plank", category: "bodyweight", primaryMuscleGroup: "core", secondaryMuscleGroups: '[]' },
  { name: "Crunch", category: "bodyweight", primaryMuscleGroup: "core", secondaryMuscleGroups: '[]' },
  { name: "Hanging Leg Raise", category: "bodyweight", primaryMuscleGroup: "core", secondaryMuscleGroups: '[]' },
  { name: "Cable Woodchop", category: "cable", primaryMuscleGroup: "core", secondaryMuscleGroups: '["shoulders"]' },
  { name: "Ab Wheel Rollout", category: "other", primaryMuscleGroup: "core", secondaryMuscleGroups: '["shoulders"]' },
  { name: "Russian Twist", category: "bodyweight", primaryMuscleGroup: "core", secondaryMuscleGroups: '[]' },
  { name: "Dead Bug", category: "bodyweight", primaryMuscleGroup: "core", secondaryMuscleGroups: '[]' },
  { name: "Pallof Press", category: "cable", primaryMuscleGroup: "core", secondaryMuscleGroups: '[]' },

  // Forearms (2)
  { name: "Wrist Curl", category: "dumbbell", primaryMuscleGroup: "forearms", secondaryMuscleGroups: '[]' },
  { name: "Reverse Wrist Curl", category: "dumbbell", primaryMuscleGroup: "forearms", secondaryMuscleGroups: '[]' },

  // Cardio (6)
  { name: "Treadmill Running", category: "cardio", primaryMuscleGroup: "full_body", secondaryMuscleGroups: '[]' },
  { name: "Rowing Machine", category: "cardio", primaryMuscleGroup: "full_body", secondaryMuscleGroups: '["back"]' },
  { name: "Cycling (Stationary)", category: "cardio", primaryMuscleGroup: "full_body", secondaryMuscleGroups: '["quads"]' },
  { name: "Elliptical", category: "cardio", primaryMuscleGroup: "full_body", secondaryMuscleGroups: '[]' },
  { name: "Stair Climber", category: "cardio", primaryMuscleGroup: "full_body", secondaryMuscleGroups: '["quads","glutes"]' },
  { name: "Jump Rope", category: "cardio", primaryMuscleGroup: "full_body", secondaryMuscleGroups: '["calves"]' },

  // Full Body (4)
  { name: "Clean and Press", category: "barbell", primaryMuscleGroup: "full_body", secondaryMuscleGroups: '["shoulders","quads","back"]' },
  { name: "Kettlebell Swing", category: "other", primaryMuscleGroup: "full_body", secondaryMuscleGroups: '["glutes","hamstrings","core"]' },
  { name: "Burpee", category: "bodyweight", primaryMuscleGroup: "full_body", secondaryMuscleGroups: '["chest","quads","core"]' },
  { name: "Turkish Get-Up", category: "other", primaryMuscleGroup: "full_body", secondaryMuscleGroups: '["shoulders","core"]' },
] as const;

async function seed() {
  console.log("Seeding database...");

  // Create admin user if not exists
  const adminEmail = process.env.ADMIN_EMAIL || "admin@gym.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "changeme";

  const existingAdmin = await db.query.users.findFirst({
    where: eq(schema.users.email, adminEmail),
  });

  if (!existingAdmin) {
    const passwordHash = await hash(adminPassword, 12);
    await db.insert(schema.users).values({
      email: adminEmail,
      name: "Admin",
      passwordHash,
      role: "admin",
      forcePasswordChange: false,
    });
    console.log(`Admin user created: ${adminEmail}`);
  } else {
    console.log("Admin user already exists, skipping.");
  }

  // Seed exercises (skip existing)
  const existingExercises = await db.query.exercises.findMany();
  const existingNames = new Set(existingExercises.map((e) => e.name));

  const newExercises = EXERCISES.filter((e) => !existingNames.has(e.name));

  if (newExercises.length > 0) {
    await db.insert(schema.exercises).values(
      newExercises.map((e) => ({
        name: e.name,
        category: e.category,
        primaryMuscleGroup: e.primaryMuscleGroup,
        secondaryMuscleGroups: e.secondaryMuscleGroups,
        isCustom: false,
      }))
    );
    console.log(`Seeded ${newExercises.length} exercises.`);
  } else {
    console.log("All exercises already exist, skipping.");
  }

  console.log("Seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
