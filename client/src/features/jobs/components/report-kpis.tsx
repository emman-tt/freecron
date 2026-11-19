//Report KPIs — server aggregates over ALL history (GET /api/executions/stats)
//as one strip: value first, label under it, hover explainers. "Last failure"
//= the design's "Down time", renamed for clarity. The chart beside it stays
//a page-1 series (visual, not a claim).
import { Info } from "lucide-react";
import type { ExecutionStats } from "../../executions/api/execution.types";
import { dayLabel, durationLabel } from "../../../shared/lib/format";

const TIPS: Record<string, string> = {
  "Last failure":
    "When the most recent run ended failed or timed out. “None” means this job has never had a failed run.",
  Average:
    "Mean runtime across every finished run in this job's entire history.",
  Uptime:
    "Share of finished runs that succeeded. Runs still in flight don't count against it, and a run that failed once but succeeded on retry counts as up.",
  Lowest: "Shortest measured duration of any finished run.",
  Highest:
    "Longest measured duration. A run interrupted by a server restart counts the whole outage as runtime, so one outlier can make this look huge.",
  Status:
    "How the most recent run ended — Up: succeeded (green), Down: failed or timed out (red), Running: in flight (amber). A switched-off job shows Paused.",
};

export function ReportKPIs({
  stats: s,
  jobActive,
}: {
  stats?: ExecutionStats;
  //a paused job's lastStatus is a relic of when it last ran — the current
  //truth about the job is "switched off", so Paused (amber) overrides
  jobActive?: boolean;
}) {
  const paused = jobActive === false;
  const status = paused
    ? "Paused"
    : !s?.lastStatus
      ? "—"
      : s.lastStatus === "success"
        ? "Up"
        : s.lastStatus === "running"
          ? "Running"
          : "Down";
  const statusColor = paused
    ? "text-warning"
    : s?.lastStatus === "success"
      ? "text-success"
      : s?.lastStatus === "running"
        ? "text-warning"
        : s?.lastStatus
          ? "text-danger"
          : "text-muted";

  const kpis: Array<[string, string, string?]> = [
    ["Last failure", s?.lastFailureAt ? dayLabel(s.lastFailureAt) : "None"],
    ["Average", durationLabel(s?.avgMs)],
    ["Uptime", s?.uptimePct == null ? "—" : `${s.uptimePct}%`],
    ["Lowest", durationLabel(s?.minMs)],
    ["Highest", durationLabel(s?.maxMs)],
    ["Status", status, statusColor],
  ];

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-5 rounded-[16px] border border-border/80 bg-card px-6 py-5 sm:grid-cols-3 lg:grid-cols-6">
      {kpis.map(([label, value, color]) => (
        <div key={label} className="group relative flex min-w-0 flex-col gap-1">
          <span
            className={`truncate text-[24px] leading-none font-bold tracking-[-0.02em] ${
              color ?? "text-ink"
            }`}
            title={value}
          >
            {value}
          </span>
          <span className="flex items-center gap-1 text-[12.5px] text-muted">
            {label}
            <Info size={10} className="shrink-0 cursor-help text-muted/60" />
          </span>
          <span className="pointer-events-none absolute top-full left-0 z-20 mt-1 hidden w-56 rounded-xl bg-primary p-2.5 text-[11px] leading-snug text-white shadow-lg group-hover:block">
            {TIPS[label]}
          </span>
        </div>
      ))}
    </div>
  );
}
