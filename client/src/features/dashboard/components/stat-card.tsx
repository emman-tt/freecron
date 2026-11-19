//Stat card — label, big value, tiny context line. Value can carry a tone
//(green for healthy, red for failures) and the card can skeleton while
//the aggregate loads.
import { Info } from "lucide-react";

type Tone = "plain" | "success" | "danger";

const valueTone: Record<Tone, string> = {
  plain: "text-ink",
  success: "text-success",
  danger: "text-danger",
};

export function StatCard({
  label,
  value,
  sub,
  tip,
  tone = "plain",
  loading = false,
}: {
  label: string;
  value: number | string;
  sub?: string;
  //hover explainer, shaped like the report KPI tooltips
  tip?: string;
  tone?: Tone;
  loading?: boolean;
}) {
  return (
    <div className="group relative flex min-w-0 flex-col gap-2 rounded-[14px] border border-border/80 bg-card px-5 py-4">
      <span className="flex items-center gap-1.5 text-[12px] font-medium text-muted">
        {label}
        {tip && <Info size={11} className="shrink-0 cursor-help text-muted/70" />}
      </span>

      {loading ? (
        <span className="h-7 w-16 animate-pulse rounded-md bg-border/70" />
      ) : (
        <span className={`text-[26px] leading-none font-bold tracking-[-0.02em] ${valueTone[tone]}`}>
          {value}
        </span>
      )}

      <span className="min-h-[15px] text-[12px] text-muted">{loading ? "" : sub}</span>

      {tip && (
        <span className="pointer-events-none absolute top-full left-0 z-20 mt-1.5 hidden w-56 rounded-xl bg-primary p-2.5 text-[11px] leading-snug text-white shadow-lg group-hover:block">
          {tip}
        </span>
      )}
    </div>
  );
}
