import { redirect } from "next/navigation";
import { eq, and } from "drizzle-orm";
import { requireUser, verifySession } from "@/lib/auth/dal";
import db from "@/lib/db";
import { routines } from "@/lib/db/schema";
import { getTemplates } from "../../workouts/templates/actions";
import { RoutineEditor } from "./routine-editor";

export default async function RoutineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const session = await verifySession();

  const routine = await db.query.routines.findFirst({
    where: and(
      eq(routines.id, Number(id)),
      eq(routines.userId, session.userId)
    ),
    with: {
      days: {
        with: {
          template: true,
        },
      },
    },
  });

  if (!routine) redirect("/app/routines");

  const templates = await getTemplates();

  const routineData = {
    id: routine.id,
    name: routine.name,
    isActive: routine.isActive,
    days: routine.days.map((d) => ({
      id: d.id,
      dayOfWeek: d.dayOfWeek,
      templateId: d.templateId,
      templateName: d.template.name,
    })),
  };

  return <RoutineEditor routine={routineData} templates={templates} />;
}
