//Report KPIs — design: one white R16 card, six stats (15/700 value over an
//11px muted label): Down time, Average, Uptime, Lowest, Highest, Status.
//Numbers come from GET /api/executions/stats — exact aggregates over ALL
//history of the job, not the loaded page. The chart beside it stays a
//page-1 series (visual, not a claim)
import type { ExecutionStats } from "../../executions/api/execution.types";
import { dayLabel } from "../../../shared/lib/format";

export function ReportKPIs({ stats: s }: { stats?: ExecutionStats }) {
  const fmt = (ms: number | null | undefined) =>
    ms == null ? "—" : `${(ms / 1000).toFixed(2)}s`;

  const status = !s?.lastStatus
    ? "—"
    : s.lastStatus === "success"
      ? "Up"
      : s.lastStatus === "running"
        ? "Running"
        : "Down";

  const kpis: Array<[string, string]> = [
    ["Down time", s?.lastFailureAt ? `since ${dayLabel(s.lastFailureAt)}` : "None"],
    ["Average", fmt(s?.avgMs)],
    ["Uptime", s?.uptimePct == null ? "—" : `${s.uptimePct}%`],
    ["Lowest", fmt(s?.minMs)],
    ["Highest", fmt(s?.maxMs)],
    ["Status", status],
  ];

  return (
    <div className="flex flex-wrap gap-2.5 rounded-[16px] bg-card p-3.5">
      {kpis.map(([label, value]) => (
        <div key={label} className="flex min-w-24 flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-bold text-[#0a0a0a]">{value}</span>
          <span className="text-[11px] text-muted">{label}</span>
        </div>
      ))}
    </div>
  );
}
