import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
        <Link href="/app/more" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> More</Link>
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
