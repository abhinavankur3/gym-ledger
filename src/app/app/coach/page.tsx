import { MessageCircle, Repeat, Sparkles, TrendingUp } from "lucide-react";
import { ProfileButton } from "@/components/layout/page-header";
import { PlaceholderHero, PlannedFeatures } from "./placeholder";

export default function CoachPage() {
  return (
    <main className="pb-6">
      <div className="flex justify-end pt-6 md:pt-10"><ProfileButton /></div>
      <PlaceholderHero tone="pull" kicker="Coach" title="Your coach" watermark="Coach" icon={MessageCircle} className="mt-3" />
      <PlannedFeatures
        intro="Your coach will use what you actually log to keep the plan right for you."
        features={[
          { icon: Sparkles, title: "Ask anything", detail: "Questions about your training, food or progress, answered from your own data." },
          { icon: Repeat, title: "Plans that adapt", detail: "Sessions and targets adjust when you miss days, stall or push ahead." },
          { icon: TrendingUp, title: "Weekly check-ins", detail: "A short summary of what changed and what to focus on next." },
        ]}
      />
    </main>
  );
}
