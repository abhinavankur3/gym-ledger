import { drizzle } from "drizzle-orm/libsql";
import { sql } from "drizzle-orm";
import { hash } from "bcryptjs";

const db = drizzle({
  connection: {
    url: process.env.DATABASE_URL || "file:./data/gym-ledger.db",
  },
});

const EXERCISES = [
  ["Barbell Bench Press","barbell","chest",'["triceps","shoulders"]'],
  ["Incline Barbell Bench Press","barbell","chest",'["triceps","shoulders"]'],
  ["Dumbbell Bench Press","dumbbell","chest",'["triceps","shoulders"]'],
  ["Incline Dumbbell Bench Press","dumbbell","chest",'["triceps","shoulders"]'],
  ["Dumbbell Fly","dumbbell","chest",'["shoulders"]'],
  ["Cable Fly","cable","chest",'["shoulders"]'],
  ["Machine Chest Press","machine","chest",'["triceps","shoulders"]'],
  ["Pec Deck","machine","chest",'[]'],
  ["Push-Up","bodyweight","chest",'["triceps","shoulders","core"]'],
  ["Dips (Chest)","bodyweight","chest",'["triceps","shoulders"]'],
  ["Barbell Row","barbell","back",'["biceps","forearms"]'],
  ["Deadlift","barbell","back",'["hamstrings","glutes","forearms","core"]'],
  ["Pull-Up","bodyweight","back",'["biceps","forearms"]'],
  ["Chin-Up","bodyweight","back",'["biceps"]'],
  ["Lat Pulldown","cable","back",'["biceps"]'],
  ["Seated Cable Row","cable","back",'["biceps","forearms"]'],
  ["Dumbbell Row","dumbbell","back",'["biceps","forearms"]'],
  ["T-Bar Row","barbell","back",'["biceps","forearms"]'],
  ["Face Pull","cable","back",'["shoulders"]'],
  ["Machine Row","machine","back",'["biceps"]'],
  ["Overhead Press","barbell","shoulders",'["triceps"]'],
  ["Dumbbell Shoulder Press","dumbbell","shoulders",'["triceps"]'],
  ["Lateral Raise","dumbbell","shoulders",'[]'],
  ["Front Raise","dumbbell","shoulders",'[]'],
  ["Reverse Fly","dumbbell","shoulders",'["back"]'],
  ["Arnold Press","dumbbell","shoulders",'["triceps"]'],
  ["Cable Lateral Raise","cable","shoulders",'[]'],
  ["Machine Shoulder Press","machine","shoulders",'["triceps"]'],
  ["Barbell Curl","barbell","biceps",'["forearms"]'],
  ["Dumbbell Curl","dumbbell","biceps",'["forearms"]'],
  ["Hammer Curl","dumbbell","biceps",'["forearms"]'],
  ["Preacher Curl","barbell","biceps",'["forearms"]'],
  ["Cable Curl","cable","biceps",'["forearms"]'],
  ["Incline Dumbbell Curl","dumbbell","biceps",'[]'],
  ["Tricep Pushdown","cable","triceps",'[]'],
  ["Overhead Tricep Extension","dumbbell","triceps",'[]'],
  ["Skull Crusher","barbell","triceps",'[]'],
  ["Dips (Tricep)","bodyweight","triceps",'["chest","shoulders"]'],
  ["Cable Overhead Extension","cable","triceps",'[]'],
  ["Close-Grip Bench Press","barbell","triceps",'["chest","shoulders"]'],
  ["Barbell Squat","barbell","quads",'["glutes","hamstrings","core"]'],
  ["Front Squat","barbell","quads",'["glutes","core"]'],
  ["Leg Press","machine","quads",'["glutes"]'],
  ["Leg Extension","machine","quads",'[]'],
  ["Goblet Squat","dumbbell","quads",'["glutes","core"]'],
  ["Hack Squat","machine","quads",'["glutes"]'],
  ["Bulgarian Split Squat","dumbbell","quads",'["glutes","hamstrings"]'],
  ["Walking Lunge","dumbbell","quads",'["glutes","hamstrings"]'],
  ["Romanian Deadlift","barbell","hamstrings",'["glutes","back"]'],
  ["Leg Curl","machine","hamstrings",'[]'],
  ["Seated Leg Curl","machine","hamstrings",'[]'],
  ["Stiff-Leg Deadlift","barbell","hamstrings",'["glutes","back"]'],
  ["Nordic Hamstring Curl","bodyweight","hamstrings",'[]'],
  ["Hip Thrust","barbell","glutes",'["hamstrings"]'],
  ["Cable Pull-Through","cable","glutes",'["hamstrings"]'],
  ["Glute Bridge","bodyweight","glutes",'["hamstrings"]'],
  ["Cable Kickback","cable","glutes",'[]'],
  ["Standing Calf Raise","machine","calves",'[]'],
  ["Seated Calf Raise","machine","calves",'[]'],
  ["Donkey Calf Raise","machine","calves",'[]'],
  ["Plank","bodyweight","core",'[]'],
  ["Crunch","bodyweight","core",'[]'],
  ["Hanging Leg Raise","bodyweight","core",'[]'],
  ["Cable Woodchop","cable","core",'["shoulders"]'],
  ["Ab Wheel Rollout","other","core",'["shoulders"]'],
  ["Russian Twist","bodyweight","core",'[]'],
  ["Dead Bug","bodyweight","core",'[]'],
  ["Pallof Press","cable","core",'[]'],
  ["Wrist Curl","dumbbell","forearms",'[]'],
  ["Reverse Wrist Curl","dumbbell","forearms",'[]'],
  ["Treadmill Running","cardio","full_body",'[]'],
  ["Rowing Machine","cardio","full_body",'["back"]'],
  ["Cycling (Stationary)","cardio","full_body",'["quads"]'],
  ["Elliptical","cardio","full_body",'[]'],
  ["Stair Climber","cardio","full_body",'["quads","glutes"]'],
  ["Jump Rope","cardio","full_body",'["calves"]'],
  ["Clean and Press","barbell","full_body",'["shoulders","quads","back"]'],
  ["Kettlebell Swing","other","full_body",'["glutes","hamstrings","core"]'],
  ["Burpee","bodyweight","full_body",'["chest","quads","core"]'],
  ["Turkish Get-Up","other","full_body",'["shoulders","core"]'],
];

async function seed() {
  console.log("Seeding database...");

  const adminEmail = process.env.ADMIN_EMAIL || "admin@gym.local";
  const adminPassword = process.env.ADMIN_PASSWORD || "changeme";

  // Check if admin exists
  const existing = await db.run(sql`SELECT id FROM users WHERE email = ${adminEmail} LIMIT 1`);
  if (existing.rows.length === 0) {
    const passwordHash = await hash(adminPassword, 12);
    await db.run(sql`INSERT INTO users (email, name, password_hash, role, force_password_change, created_at, updated_at) VALUES (${adminEmail}, 'Admin', ${passwordHash}, 'admin', 0, datetime('now'), datetime('now'))`);
    console.log(`Admin user created: ${adminEmail}`);
  } else {
    console.log("Admin user already exists, skipping.");
  }

  // Seed exercises
  const existingExercises = await db.run(sql`SELECT COUNT(*) as count FROM exercises`);
  const count = existingExercises.rows[0]?.count ?? 0;

  if (count === 0) {
    for (const [name, category, muscle, secondary] of EXERCISES) {
      await db.run(sql`INSERT INTO exercises (name, category, primary_muscle_group, secondary_muscle_groups, is_custom) VALUES (${name}, ${category}, ${muscle}, ${secondary}, 0)`);
    }
    console.log(`Seeded ${EXERCISES.length} exercises.`);
  } else {
    console.log(`${count} exercises already exist, skipping.`);
  }

  console.log("Seed complete!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
