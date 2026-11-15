//Report KPIs — server aggregates over ALL history (GET /api/executions/stats)
//with hover tooltips. "Last failure" = the design's "Down time", renamed for
//clarity. The chart beside it stays a page-1 series (visual, not a claim)
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
    "How the most recent run ended — Up: succeeded (green), Down: failed or timed out (red), Running: in flight (blue). A switched-off job shows Paused.",
};

export function ReportKPIs({
  stats: s,
  jobActive,
}: {
  stats?: ExecutionStats;
  //a paused job's lastStatus is a relic of when it last ran — the current
  //truth about the job is "switched off", so Paused (yellow) overrides
  jobActive?: boolean;
}) {
  //green Up · blue Running · red Down · yellow Paused
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
    ? "text-[#EAB308]"
    : s?.lastStatus === "success"
      ? "text-[#22C55E]"
      : s?.lastStatus === "running"
        ? "text-[#0EA5E9]"
        : s?.lastStatus
          ? "text-[#FF2E2E]"
          : undefined;

  const kpis: Array<[string, string, string?]> = [
    ["Last failure", s?.lastFailureAt ? dayLabel(s.lastFailureAt) : "None"],
    ["Average", durationLabel(s?.avgMs)],
    ["Uptime", s?.uptimePct == null ? "—" : `${s.uptimePct}%`],
    ["Lowest", durationLabel(s?.minMs)],
    ["Highest", durationLabel(s?.maxMs)],
    ["Status", status, statusColor],
  ];

  return (
    <div className="flex flex-wrap gap-2.5 rounded-[16px] bg-card p-3.5">
      {kpis.map(([label, value, color]) => (
        <div key={label} className="group relative flex min-w-24 flex-1 flex-col gap-0.5">
          <span className={`text-[15px] font-bold ${color ?? "text-[#0a0a0a]"}`}>
            {value}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted">
            {label}
            <Info size={11} className="shrink-0 cursor-help text-muted/70" />
          </span>
          <span className="pointer-events-none absolute left-0 top-full z-10 mt-1 hidden w-56 rounded-xl bg-[#0a0a0a] p-2.5 text-[11px] leading-snug text-white shadow-lg group-hover:block">
            {TIPS[label]}
          </span>
        </div>
      ))}
    </div>
  );
}
