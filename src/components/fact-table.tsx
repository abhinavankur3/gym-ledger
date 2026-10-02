import { cn } from "@/lib/utils";

export type Fact = { label: React.ReactNode; value: React.ReactNode; key?: string };

/** Label/value rows split by a vertical rule — the "nutrition facts" table pattern. */
export function FactTable({ rows, className }: { rows: Fact[]; className?: string }) {
  return (
    <dl className={cn("divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card", className)}>
      {rows.map((row, index) => (
        <div key={row.key ?? index} className="grid grid-cols-[1fr_7.5rem]">
          <dt className="min-w-0 truncate px-4 py-3.5 text-[0.95rem]">{row.label}</dt>
          <dd className="tabular flex items-center justify-end border-l border-border px-4 py-3.5 text-[0.95rem] font-semibold">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
