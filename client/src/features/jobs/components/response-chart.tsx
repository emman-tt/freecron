//Response times — last 30 completed runs, oldest → newest. Failed runs red;
//hover shows duration + when. Log scale when one outlier would flatten the rest
import type { Execution } from "../../executions/api/execution.types";
import { durationLabel, dayLabel, hm } from "../../../shared/lib/format";

export function ResponseChart({ runs }: { runs: Execution[] }) {
  const points = runs
    .filter((r) => r.duration !== null)
    .slice(0, 30)
    .reverse();
  const durations = points.map((r) => r.duration!);
  const max = Math.max(...durations, 1);
  const min = Math.min(...durations, max);
  //log when an outlier (e.g. a run that waited out a server restart) flattens everything
  const log = max > min * 50;

  const height = (d: number): number => {
    if (log) {
      const lo = Math.log(Math.max(min, 1));
      const hi = Math.log(Math.max(max, 1));
      const span = Math.max(hi - lo, 0.01);
      return Math.max(((Math.log(Math.max(d, 1)) - lo) / span) * 100, 4);
    }
    const span = Math.max(max - min, 1);
    return Math.max(((d - min) / span) * 100, 4);
  };

  return (
    <div className="flex flex-col gap-2.5 rounded-[16px] bg-card p-4.5">
      <p className="text-[15px] font-bold text-[#0a0a0a]">Response times</p>
      <div className="flex h-[110px] items-end gap-1">
        {points.map((r) => (
          <div
            key={r.id}
            className="group relative flex h-full min-w-0 flex-1 cursor-default items-end"
          >
            <div
              className={`w-full rounded-t-md ${
                r.status === "failed" || r.status === "timeout"
                  ? "bg-[#FF2E2E]"
                  : "bg-[#0a0a0a]"
              }`}
              style={{ height: `${height(r.duration!)}%` }}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-xl bg-[#0a0a0a] p-2 text-[11px] text-white shadow-lg group-hover:block">
              <span className="font-bold">{durationLabel(r.duration)}</span>
              <span className="text-white/60">
                {"  ·  "}
                {dayLabel(r.startedAt)} {hm(r.startedAt)}
              </span>
            </span>
          </div>
        ))}
        {points.length === 0 && (
          <p className="text-[13px] text-muted">No completed runs yet.</p>
        )}
      </div>
      {points.length > 0 && (
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span>
            {dayLabel(points[0].startedAt)} {hm(points[0].startedAt)}
          </span>
          <span>
            {log && "log scale · "}
            {points.length} runs
          </span>
        </div>
      )}
    </div>
  );
}
