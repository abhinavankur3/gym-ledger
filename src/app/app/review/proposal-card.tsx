"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarMinus, Check, Feather, Flame, Loader2, Timer, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Proposal } from "@/lib/adaptive/review";
import { decideProposal } from "./actions";

const ICON = { training_days: CalendarMinus, session_length: Timer, deload: Feather, calories: Flame } as const;
const TONE = { training_days: "bg-pull/15 text-pull", session_length: "bg-pull/15 text-pull", deload: "bg-sun/25 text-ink dark:text-sun", calories: "bg-legs/15 text-legs" } as const;

/** One suggested change with its reason, and Accept / Not now. */
export function ProposalCard({ reviewId, proposal }: { reviewId: number; proposal: Proposal }) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const router = useRouter();
  const Icon = ICON[proposal.type];
  const rebuildsPlan = proposal.type === "training_days" || proposal.type === "session_length";

  function decide(accept: boolean) {
    setBusy(accept ? "accept" : "decline");
    startTransition(async () => {
      const result = await decideProposal(reviewId, proposal.id, accept);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      if (accept) toast.success(rebuildsPlan ? "New plan drafted. Review it next." : "Change applied");
      if (result?.next) router.push(result.next);
      else router.refresh();
    });
  }

  return (
    <article className={cn("rounded-3xl bg-card p-5 shadow-soft dark:ring-1 dark:ring-white/5", proposal.status !== "pending" && "opacity-80")}>
      <div className="flex items-start gap-3">
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", TONE[proposal.type])}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg leading-tight">{proposal.title}</h3>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{proposal.reason}</p>
        </div>
      </div>
      {proposal.status === "pending" ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => decide(false)} disabled={pending}>
            {pending && busy === "decline" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Not now
          </Button>
          <Button onClick={() => decide(true)} disabled={pending}>
            {pending && busy === "accept" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {rebuildsPlan ? "Accept and rebuild" : "Accept"}
          </Button>
        </div>
      ) : (
        <p className={cn("mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold", proposal.status === "accepted" ? "bg-legs text-ink" : "bg-muted text-muted-foreground")}>
          {proposal.status === "accepted" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <X className="h-3.5 w-3.5" />}
          {proposal.status === "accepted" ? "Accepted" : "Not now"}
        </p>
      )}
      {rebuildsPlan && proposal.status === "pending" && <p className="mt-2 text-xs text-muted-foreground">Kochi drafts a new plan for you to review before it replaces the current one.</p>}
    </article>
  );
}
