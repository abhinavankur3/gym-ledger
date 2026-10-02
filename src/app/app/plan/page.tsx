import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { PageHeader } from "@/components/layout/page-header";
import { getPlanDraft } from "./actions";
import { PlanReview } from "./plan-review";

export default async function PlanPage() {
  await requireUser();
  const draft = await getPlanDraft();
  if (!draft) redirect("/app");

  return (
    <main className="pb-12">
      <PageHeader
        back={{ href: "/app", label: "Home" }}
        title="Your plan"
        subtitle="Confirm it when it feels right, or tell your coach what to change."
      />
      <PlanReview plan={draft.plan} feedback={draft.feedback} />
    </main>
  );
}
