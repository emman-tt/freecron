//Response times — design: white R16 card, dark bars (6px-rounded tops) on a
//110px row, one per completed run, oldest → newest left to right. Failed runs
//carry their duration too; runs without one are skipped
import type { Execution } from "../../executions/api/execution.types";

export function ResponseChart({ runs }: { runs: Execution[] }) {
  const points = runs
    .filter((r) => r.duration !== null)
    .slice(0, 12)
    .reverse();
  const max = Math.max(...points.map((r) => r.duration!), 1);

  return (
    <div className="flex flex-col gap-2.5 rounded-[16px] bg-card p-4.5">
      <p className="text-[15px] font-bold text-[#0a0a0a]">Response times</p>
      <div className="flex h-[110px] items-end gap-2">
        {points.map((r) => (
          <div
            key={r.id}
            className="flex-1 rounded-t-md bg-[#0a0a0a]"
            style={{ height: `${Math.max((r.duration! / max) * 100, 4)}%` }}
            title={`${(r.duration! / 1000).toFixed(2)}s`}
          />
        ))}
        {points.length === 0 && (
          <p className="text-[13px] text-muted">No completed runs yet.</p>
        )}
      </div>
    </div>
  );
}
