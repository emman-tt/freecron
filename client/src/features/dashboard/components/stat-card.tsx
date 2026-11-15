//Stat card — design: borderless white R18 card, p-16 / gap-6; muted 12/500
//label, 24/700 value, and a tiny 12px "Stat Sub" info line under the value
//("+2 this week", "75% healthy", …). Presentational
import { Info } from "lucide-react";

export function StatCard({
  label,
  value,
  sub,
  tip,
}: {
  label: string;
  value: number | string;
  sub?: string;
  //hover explainer — plain-English definition of the number (shaped like the
  //tooltip on the report KPIs)
  tip?: string;
}) {
  return (
    <div className="group relative flex flex-col gap-1.5 rounded-[18px] bg-card p-4">
      <span className="flex items-center gap-1 text-[12px] font-medium text-muted">
        {label}
        {tip && (
          <Info size={11} className="shrink-0 cursor-help text-muted/70" />
        )}
      </span>
      <span className="text-[24px] font-bold text-[#0a0a0a]">{value}</span>
      {sub != null && <span className="text-[12px] text-muted">{sub}</span>}
      {tip && (
        <span className="pointer-events-none absolute bottom-full left-0 z-10 mb-1.5 hidden w-56 rounded-xl bg-[#0a0a0a] p-2.5 text-[11px] leading-snug text-white shadow-lg group-hover:block">
          {tip}
        </span>
      )}
    </div>
  );
}
