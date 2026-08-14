import type { SpecRow } from "../../lib/productDisplay.ts";

interface ProductDetailGridProps {
  rows: SpecRow[];
}

export default function ProductDetailGrid({ rows }: ProductDetailGridProps) {
  if (rows.length === 0) return null;

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-0 border-t border-white/[0.06] pt-8">
      {rows.map((row, idx) => (
        <div
          key={`${row.label}-${idx}`}
          className="py-4 border-b border-white/[0.04] grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,42%)_1fr] sm:gap-4"
        >
          <dt className="text-[9px] uppercase tracking-[0.3em] text-white/35 font-medium">{row.label}</dt>
          <dd className="text-[13px] text-white/85 font-light leading-relaxed">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
