//Recent runs — compact table for the dashboard detail panel. No "attempt"
//column: the API models retries inside one execution row, so the attempt
//count would be invented. Response is a one-line preview of the stored body.
import type { Execution } from "../api/execution.types";
import { dayLabel, durationLabel, hm } from "../../../shared/lib/format";

const statusTone: Record<Execution["status"], string> = {
  success: "text-success-strong",
  running: "text-warning",
  failed: "text-danger",
  timeout: "text-danger",
};

function preview(run: Execution): string {
  if (run.error) return run.error;
  const body = run.response?.body;
  if (body === undefined || body === null) return "—";
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return text.length > 46 ? `${text.slice(0, 46)}…` : text;
}

//"today" / "yday" read naturally lowercase; real dates keep "17 Nov"
function stamp(iso: string): string {
  const label = dayLabel(iso);
  return label === "Today" || label === "Yday" ? label.toLowerCase() : label;
}

export function RecentRunsTable({
  runs,
  onViewAll,
}: {
  runs: Execution[];
  onViewAll?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold tracking-[0.08em] text-muted uppercase">
          Recent runs
        </p>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="rounded-[8px] border border-border bg-card px-3 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:bg-muted-bg"
          >
            View all
          </button>
        )}
      </div>

      {runs.length === 0 ? (
        <p className="text-[13px] text-muted">No runs yet — press Run now to make one.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10.5px] font-semibold tracking-[0.06em] text-muted uppercase">
                <th className="py-2 pr-4 font-semibold">Time</th>
                <th className="py-2 pr-4 font-semibold">Status</th>
                <th className="py-2 pr-4 font-semibold">Duration</th>
                <th className="py-2 font-semibold">Response</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-t border-border/80">
                  <td className="py-3 pr-4 text-[12.5px] whitespace-nowrap text-ink">
                    {hm(run.startedAt)} {stamp(run.startedAt)}
                  </td>
                  <td
                    className={`py-3 pr-4 text-[12.5px] font-semibold ${statusTone[run.status]}`}
                  >
                    {run.statusCode ? run.statusCode : run.status}
                  </td>
                  <td className="py-3 pr-4 text-[12.5px] whitespace-nowrap text-ink">
                    {durationLabel(run.duration)}
                  </td>
                  <td className="max-w-[260px] truncate py-3 font-mono text-[11.5px] text-muted">
                    <span title={preview(run)}>{preview(run)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
