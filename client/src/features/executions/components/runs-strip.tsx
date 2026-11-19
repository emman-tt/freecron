//Run strip — one thin bar per execution, oldest on the left. Green success,
//red failed/timeout, amber still in flight; faint bars are slots with no run
//so a brand-new job still reads as "early", not "broken".
import type { Execution } from "../api/execution.types";
import { formatIn } from "../../../shared/lib/format";

const barTone: Record<Execution["status"], string> = {
  success: "bg-live",
  running: "bg-warning",
  failed: "bg-danger",
  timeout: "bg-danger",
};

function runTitle(run: Execution): string {
  const at = new Date(run.startedAt).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const code = run.statusCode ? ` · ${run.statusCode}` : "";
  return `${at} · ${run.status}${code}`;
}

export function RunsStrip({
  runs,
  slots = 48,
  now,
}: {
  runs: Execution[];
  slots?: number;
  now: number;
}) {
  //API returns newest first; flip so time reads left → right
  const ordered = runs.slice(0, slots).reverse();
  const padding = Math.max(0, slots - ordered.length);
  const oldest = ordered[0];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-9 items-stretch gap-[3px]">
        {Array.from({ length: slots }).map((_, i) => {
          const run = ordered[i - padding];
          if (!run) {
            return <span key={`slot-${i}`} className="flex-1 rounded-[2px] bg-border/60" />;
          }
          return (
            <span
              key={run.id}
              title={runTitle(run)}
              className={`flex-1 rounded-[2px] transition-opacity hover:opacity-75 ${barTone[run.status]}`}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted">
        <span>
          {oldest
            ? `~${formatIn(now - new Date(oldest.startedAt).getTime())} ago`
            : "no runs yet"}
        </span>
        <span>now</span>
      </div>
    </div>
  );
}
