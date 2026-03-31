import db from "@/lib/db";
import { requireUser } from "@/lib/auth/dal";
import { BlurFade } from "@/components/ui/blur-fade";
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
    <div className="px-4 pt-8">
      <BlurFade delay={0}>
        <h1 className="text-2xl font-bold tracking-tight">Exercise Library</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {allExercises.length} exercises
        </p>
      </BlurFade>

      <BlurFade delay={0.1}>
        <ExerciseList exercises={allExercises} />
      </BlurFade>
    </div>
  );
}
