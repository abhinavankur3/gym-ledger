import db from "@/lib/db";
import { requireUser } from "@/lib/auth/dal";
import { PageHeader } from "@/components/layout/page-header";
import { ExerciseList } from "./exercise-list";

export default async function ExercisesPage() {
  await requireUser();

  const allExercises = await db.query.exercises.findMany({
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
