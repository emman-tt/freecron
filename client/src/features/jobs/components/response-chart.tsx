//Response times — a linear bar chart of the newest runs (oldest → newest).
//Grey bars for normal runs, red for failed/timeout, black for the latest.
//A dashed line marks the window average. The caption calls out outliers
//instead of hiding them behind a flattened scale.
import type { Execution } from "../../executions/api/execution.types";
import { durationLabel, hm } from "../../../shared/lib/format";

const MAX_BARS = 12;

function listWithAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export function ResponseChart({ runs }: { runs: Execution[] }) {
  const points = runs
    .filter((run) => run.duration !== null)
    .slice(0, MAX_BARS)
    .reverse();

  if (points.length === 0) {
    return (
      <div className="flex min-h-[280px] flex-col items-center justify-center gap-1 rounded-[16px] border border-border/80 bg-card p-6 text-center">
        <p className="text-[13px] font-semibold text-ink">No completed runs yet</p>
        <p className="text-[12px] text-muted">
          Press Run now and the response-time history starts here.
        </p>
      </div>
    );
  }

  const durations = points.map((run) => run.duration!);
  const top = Math.max(...durations, 1);
  const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const latest = points[points.length - 1];
  const avgPct = Math.min((avg / top) * 100, 100);

  //Outliers: runs over a second, excluding the one already called "latest"
  const slow = points
    .slice(0, -1)
    .filter((run) => run.duration! >= 1000)
    .map((run) => `${hm(run.startedAt)} (${durationLabel(run.duration)})`);

  const caption =
    slow.length > 0
      ? `Spikes at ${listWithAnd(slow)} are the other ${
          slow.length === 1 ? "run" : "runs"
        } over a second${latest.duration! >= 1000 ? `, besides ${hm(latest.startedAt)}` : ""}.`
      : latest.duration! >= 1000
        ? `The latest run (${hm(latest.startedAt)}) is the only one over a second — earlier runs all finished faster.`
        : "Every run in this window finished under a second.";

  const axisMax = durationLabel(top);
  const axisMid = durationLabel(top / 2);
  const middle = points[Math.floor(points.length / 2)];

  return (
    <section className="flex flex-col gap-5 rounded-[16px] border border-border/80 bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[11px] font-bold tracking-[0.08em] text-muted uppercase">
          Response times, last {points.length} {points.length === 1 ? "run" : "runs"}
        </p>
        <p className="text-[11.5px] text-muted">
          <span className="font-semibold text-ink">Black</span> = latest ·{" "}
          <span className="border-b border-dashed border-muted">dashed</span> = average{" "}
          {durationLabel(avg)}
        </p>
      </div>

      <div className="flex gap-3">
        {/*Y axis*/}
        <div className="flex h-[190px] w-10 shrink-0 flex-col justify-between py-0 text-right text-[10.5px] text-muted">
          <span>{axisMax}</span>
          <span>{axisMid}</span>
          <span>0</span>
        </div>

        <div className="relative min-w-0 flex-1">
          {/*average line*/}
          <div
            className="pointer-events-none absolute right-0 left-0 z-10 border-t border-dashed border-muted/70"
            style={{ bottom: `${avgPct}%` }}
          />
          <div className="flex h-[190px] items-end gap-1.5">
            {points.map((run) => {
              const failed = run.status === "failed" || run.status === "timeout";
              const isLatest = run.id === latest.id;
              return (
                <div
                  key={run.id}
                  className="group relative flex h-full min-w-0 flex-1 cursor-default items-end"
                >
                  <div
                    className={`w-full rounded-t-[3px] transition-opacity group-hover:opacity-80 ${
                      failed ? "bg-danger" : isLatest ? "bg-primary" : "bg-chart-bar"
                    }`}
                    style={{ height: `${Math.max((run.duration! / top) * 100, 1.5)}%` }}
                  />
                  <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 rounded-lg bg-primary p-2 text-[11px] whitespace-nowrap text-white shadow-lg group-hover:block">
                    <span className="font-bold">{durationLabel(run.duration)}</span>
                    <span className="text-white/60">
                      {"  ·  "}
                      {hm(run.startedAt)} · {run.status}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/*X axis*/}
      <div className="-mt-2 flex justify-between pl-[52px] text-[10.5px] text-muted">
        <span>{hm(points[0].startedAt)}</span>
        {points.length > 2 && <span>{hm(middle.startedAt)}</span>}
        <span>{hm(latest.startedAt)}</span>
      </div>

      <p className="text-[12px] text-muted">{caption}</p>
    </section>
  );
}
