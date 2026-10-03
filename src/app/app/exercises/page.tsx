import db from "@/lib/db";
import { requireUser } from "@/lib/auth/dal";
import { visibleExercises } from "@/lib/exercises";
import { PageHeader } from "@/components/layout/page-header";
import { ExerciseList } from "./exercise-list";

export default async function ExercisesPage() {
  const user = await requireUser();

  // Built-in exercises plus this user's own; other users' custom exercises stay private
  const allExercises = await db.query.exercises.findMany({
    where: visibleExercises(user.id),
    orderBy: (exercises, { asc }) => [
      asc(exercises.primaryMuscleGroup),
      asc(exercises.name),
    ],
  });

  return (
    <main className="pb-6">
      <PageHeader
        title="Exercises"
        subtitle={`${allExercises.length} in your library`}
        back={{ href: "/app/more", label: "More" }}
        hideProfile
      />
      <ExerciseList exercises={allExercises} />
    </main>
  );
}
