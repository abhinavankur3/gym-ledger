import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { getTemplateWithExercises, getAllExercises } from "../actions";
import { TemplateEditor } from "./template-editor";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireUser();

  const template = await getTemplateWithExercises(Number(id));
  if (!template) redirect("/app/workouts/templates");

  const allExercises = await getAllExercises();

  return <TemplateEditor template={template} allExercises={allExercises} />;
}
