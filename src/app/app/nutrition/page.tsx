import { CalendarDays, Camera, Target } from "lucide-react";
import { SessionHero } from "@/components/session-hero";
import { ProfileButton } from "@/components/layout/page-header";
import { PlannedFeatures } from "../coach/placeholder";

export default function NutritionPage() {
  return (
    <main className="pb-6">
      <div className="flex justify-end pt-6 md:pt-10"><ProfileButton /></div>
      <SessionHero tone="legs" kicker="Nutrition" title="Fuel the plan" watermark="Fuel" art="bowl" asHeading className="mt-3" />
      <PlannedFeatures
        intro="Nutrition is being built into your coach so meals and training share one plan."
        features={[
          { icon: Target, title: "Daily targets", detail: "Calories and protein worked out from your goal, body and training days." },
          { icon: CalendarDays, title: "A meal plan that fits", detail: "Suggestions that respect your diet and anything you avoid." },
          { icon: Camera, title: "Effortless logging", detail: "Describe a meal in a few words and your coach fills in the rest." },
        ]}
      />
    </main>
  );
}
