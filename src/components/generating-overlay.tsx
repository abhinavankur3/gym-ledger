import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE_BG, type SessionTone } from "@/lib/muscles";
import { EquipmentArt, type EquipmentKind } from "@/components/equipment-art";

/** Full-screen "Kochi is working" card for synchronous AI generation. */
export function GeneratingOverlay({ title, body, watermark, tone = "sun", art = "kettlebell" }: { title: string; body: string; watermark: string; tone?: SessionTone; art?: EquipmentKind }) {
  return (
    <div role="status" aria-live="polite" className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0e2a]/60 px-4 backdrop-blur-md">
      <div className="relative w-full max-w-sm">
        <div className={cn("relative h-36 overflow-hidden rounded-t-[2rem] text-ink", TONE_BG[tone])}>
          <span aria-hidden className="pointer-events-none absolute -left-2 top-6 select-none whitespace-nowrap font-display text-[6.5rem] leading-none text-white/30">{watermark}</span>
          <EquipmentArt kind={art} className="animate-hero-drop absolute -bottom-6 right-4 w-28" />
        </div>
        <div className="rounded-b-[2rem] bg-card p-7 shadow-lift">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="font-display text-2xl">{title}<span className="text-primary">.</span></p>
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
        </div>
      </div>
    </div>
  );
}
