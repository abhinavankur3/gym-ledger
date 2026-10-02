import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth/dal";
import { getPlanDraft } from "./actions";
import { PlanReview } from "./plan-review";

export default async function PlanPage() {
  await requireUser();
  const draft = await getPlanDraft();
  if (!draft) redirect("/app");

  return (
    <main className="px-4 pb-12 pt-8">
      <Link href="/app" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back home
      </Link>
      <div className="mt-8">
        <div className="flex items-center gap-3 text-primary">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12"><Sparkles className="h-5 w-5" /></div>
          <p className="text-xs font-bold uppercase tracking-[0.16em]">Plan studio</p>
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Your plan is ready to review.</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">Give it a quick look. Confirm it when it feels right, or tell the coach what to change and generate another version.</p>
      </div>
      <PlanReview plan={draft.plan} feedback={draft.feedback} />
    </main>
  );
}
