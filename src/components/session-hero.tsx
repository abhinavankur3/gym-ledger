import { cn } from "@/lib/utils";
import { TONE_BG, type SessionTone } from "@/lib/muscles";
import { EquipmentArt, type EquipmentKind } from "@/components/equipment-art";

type Props = {
  tone: SessionTone;
  kicker: string;
  title: string;
  /** Oversized faded word behind the title; defaults to the title */
  watermark?: string;
  art: EquipmentKind;
  artLabel?: string;
  meta?: React.ReactNode;
  /** Render the title as the page's h1 (when the hero is the screen title). */
  asHeading?: boolean;
  className?: string;
};

/**
 * Bright colour block per session type, with the session name repeated huge and faded
 * behind the title and a piece of equipment overlapping the bottom edge.
 * Leave room below it (the art hangs ~3rem past the block).
 */
export function SessionHero({ tone, kicker, title, watermark, art, artLabel, meta, asHeading, className }: Props) {
  const Title = asHeading ? "h1" : "p";
  return (
    <div className={cn("relative", className)}>
      <div className={cn("relative h-60 overflow-hidden rounded-[2rem] text-ink", TONE_BG[tone])}>
        <span
          aria-hidden
          className="pointer-events-none absolute -left-2 top-10 select-none whitespace-nowrap font-display text-[7.5rem] leading-none text-white/25"
        >
          {watermark ?? title}
        </span>
        <div className="relative p-6">
          <p className="text-sm font-semibold text-ink/70">{kicker}</p>
          <Title className="mt-16 max-w-[60%] font-display text-[2.6rem] leading-[0.95]">
            {title}
            <span className="text-white">.</span>
          </Title>
          {meta && <div className="mt-3 text-sm font-medium text-ink/75">{meta}</div>}
        </div>
      </div>
      <EquipmentArt
        kind={art}
        label={artLabel}
        className="animate-hero-drop absolute -bottom-12 right-0 drop-shadow-xl sm:right-4"
      />
    </div>
  );
}
