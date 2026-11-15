//Report KPIs — design: one white R16 card, six stats (15/700 value over an
//11px muted label): Down time, Average, Uptime, Lowest, Highest, Status.
//Computed client-side from the loaded (latest) runs — only what the data
//proves, nothing faked
import type { Execution } from "../../executions/api/execution.types";
import { dayLabel } from "../../../shared/lib/format";

export function ReportKPIs({ runs }: { runs: Execution[] }) {
  const durations = runs.map((r) => r.duration).filter((d): d is number => d !== null);
  const avg = durations.length
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : null;
  const fmt = (ms: number | null) => (ms === null ? "—" : `${(ms / 1000).toFixed(2)}s`);
  const ok = runs.filter((r) => r.status === "success").length;
  const uptime = runs.length ? Math.round((ok / runs.length) * 100) : null;
  const lastFailure = runs.find((r) => r.status === "failed" || r.status === "timeout");
  const last = runs[0];

  const kpis: Array<[string, string]> = [
    ["Down time", lastFailure ? `since ${dayLabel(lastFailure.startedAt)}` : "None"],
    ["Average", fmt(avg)],
    ["Uptime", uptime === null ? "—" : `${uptime}%`],
    ["Lowest", fmt(durations.length ? Math.min(...durations) : null)],
    ["Highest", fmt(durations.length ? Math.max(...durations) : null)],
    ["Status", !last ? "—" : last.status === "success" ? "Up" : "Down"],
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
