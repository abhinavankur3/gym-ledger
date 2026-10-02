import { cn } from "@/lib/utils";

export type EquipmentKind = "dumbbell" | "kettlebell" | "plate" | "bowl";

/**
 * Hero illustrations for session screens. Shading lives inside the object only;
 * the UI around them stays flat. Gradient ids are shared per kind, since every
 * instance of a kind is drawn identically.
 */
export function EquipmentArt({ kind, className, label }: { kind: EquipmentKind; className?: string; label?: string }) {
  if (kind === "kettlebell") return <Kettlebell className={className} label={label} />;
  if (kind === "plate") return <Plate className={className} label={label} />;
  if (kind === "bowl") return <Bowl className={className} />;
  return <Dumbbell className={className} />;
}

function GroundShadow({ cx, cy, rx }: { cx: number; cy: number; rx: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={rx * 0.12} fill="#0b0e2a" opacity="0.28" filter="url(#eq-soften)" />;
}

function SharedDefs() {
  return (
    <defs>
      <filter id="eq-soften" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
      <linearGradient id="eq-iron" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#3d4a9e" />
        <stop offset="0.55" stopColor="#222a66" />
        <stop offset="1" stopColor="#151a45" />
      </linearGradient>
      <linearGradient id="eq-steel" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f2f4fa" />
        <stop offset="0.5" stopColor="#b9bfd3" />
        <stop offset="1" stopColor="#7d84a0" />
      </linearGradient>
    </defs>
  );
}

function Dumbbell({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 170" aria-hidden className={cn("h-auto w-56", className)}>
      <SharedDefs />
      <GroundShadow cx={130} cy={138} rx={90} />
      <g transform="rotate(-16 130 80)">
        {/* handle with knurling */}
        <rect x="72" y="72" width="116" height="16" rx="8" fill="url(#eq-steel)" />
        {Array.from({ length: 9 }, (_, i) => (
          <line key={i} x1={100 + i * 7} y1="74" x2={96 + i * 7} y2="86" stroke="#7d84a0" strokeWidth="1.2" opacity="0.6" />
        ))}
        {/* collars */}
        <rect x="64" y="66" width="10" height="28" rx="3" fill="url(#eq-steel)" />
        <rect x="186" y="66" width="10" height="28" rx="3" fill="url(#eq-steel)" />
        {/* plates, inner large then outer small, each side */}
        {[
          { x: 36, y: 28, w: 28, h: 104 },
          { x: 18, y: 44, w: 20, h: 72 },
          { x: 196, y: 28, w: 28, h: 104 },
          { x: 222, y: 44, w: 20, h: 72 },
        ].map((p, i) => (
          <g key={i}>
            <rect x={p.x} y={p.y} width={p.w} height={p.h} rx="9" fill="url(#eq-iron)" />
            <rect x={p.x + 4} y={p.y + 6} width="4" height={p.h - 12} rx="2" fill="#ffffff" opacity="0.18" />
          </g>
        ))}
      </g>
    </svg>
  );
}

function Kettlebell({ className, label = "16" }: { className?: string; label?: string }) {
  return (
    <svg viewBox="0 0 200 210" aria-hidden className={cn("h-auto w-36", className)}>
      <SharedDefs />
      <defs>
        <radialGradient id="eq-bell" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#4a59b3" />
          <stop offset="0.6" stopColor="#222a66" />
          <stop offset="1" stopColor="#12163d" />
        </radialGradient>
      </defs>
      <GroundShadow cx={100} cy={196} rx={70} />
      {/* handle */}
      <path d="M58 92 C54 30 146 30 142 92" fill="none" stroke="url(#eq-iron)" strokeWidth="22" strokeLinecap="round" />
      <path d="M66 82 C66 44 112 38 124 50" fill="none" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="5" strokeLinecap="round" />
      {/* bell */}
      <path d="M100 66 C150 66 172 102 172 132 C172 162 154 182 130 186 L70 186 C46 182 28 162 28 132 C28 102 50 66 100 66 Z" fill="url(#eq-bell)" />
      <ellipse cx="70" cy="104" rx="20" ry="12" fill="#ffffff" opacity="0.14" transform="rotate(-30 70 104)" />
      <text x="100" y="150" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="40" fill="#f7c03b">{label}</text>
    </svg>
  );
}

function Plate({ className, label = "20" }: { className?: string; label?: string }) {
  return (
    <svg viewBox="0 0 200 214" aria-hidden className={cn("h-auto w-36", className)}>
      <SharedDefs />
      <GroundShadow cx={100} cy={202} rx={66} />
      <g transform="rotate(-8 100 100)">
        <circle cx="100" cy="100" r="92" fill="url(#eq-iron)" />
        <circle cx="100" cy="100" r="74" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="3" />
        <circle cx="100" cy="100" r="30" fill="url(#eq-steel)" />
        <circle cx="100" cy="100" r="13" fill="#10143a" />
        <path d="M42 54 A72 72 0 0 1 96 28" fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="6" strokeLinecap="round" />
        <text x="100" y="166" textAnchor="middle" fontFamily="var(--font-display)" fontWeight="800" fontSize="26" fill="#f7c03b">{label} KG</text>
      </g>
    </svg>
  );
}

function Bowl({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 180" aria-hidden className={cn("h-auto w-44", className)}>
      <SharedDefs />
      <defs>
        <linearGradient id="eq-bowl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d9dcea" />
        </linearGradient>
      </defs>
      <GroundShadow cx={110} cy={168} rx={74} />
      {/* greens and toppings peeking over the rim */}
      <ellipse cx="78" cy="78" rx="34" ry="20" fill="#4cb782" transform="rotate(-24 78 78)" />
      <ellipse cx="140" cy="74" rx="34" ry="18" fill="#3a9c6c" transform="rotate(20 140 74)" />
      <ellipse cx="110" cy="66" rx="26" ry="16" fill="#5cc893" />
      <circle cx="96" cy="84" r="13" fill="#f26b5b" />
      <circle cx="132" cy="88" r="11" fill="#f7c03b" />
      <circle cx="118" cy="80" r="7" fill="#f26b5b" />
      <path d="M150 62 q10 -14 22 -8" fill="none" stroke="#3a9c6c" strokeWidth="5" strokeLinecap="round" />
      {/* bowl */}
      <path d="M26 92 H194 C190 136 158 160 110 160 C62 160 30 136 26 92 Z" fill="url(#eq-bowl)" />
      <rect x="22" y="86" width="176" height="12" rx="6" fill="#ffffff" />
      <path d="M44 108 C52 132 74 146 100 150" fill="none" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="6" strokeLinecap="round" />
      <path d="M182 104 C176 130 156 146 130 152" fill="none" stroke="#1b2150" strokeOpacity="0.08" strokeWidth="8" strokeLinecap="round" />
    </svg>
  );
}
