//Run cards — gray R12: status dot, "02:08 Today", "200 • 1.1s"
import type { Execution } from "../api/execution.types";
import { dayLabel, hm } from "../../../shared/lib/format";

const dotClass: Record<Execution["status"], string> = {
  success: "bg-[#22C55E]",
  running: "bg-[#EAB308]",
  failed: "bg-[#FF2E2E]",
  timeout: "bg-[#FF2E2E]",
};

export function RunCards({
  runs,
  empty = "No runs yet.",
}: {
  runs: Execution[];
  empty?: string;
}) {
  if (runs.length === 0) return <p className="text-[13px] text-muted">{empty}</p>;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {runs.slice(0, 4).map((r) => (
        <div key={r.id} className="flex flex-col gap-1 rounded-control bg-muted-bg p-3">
          <span className={`h-2 w-2 rounded-full ${dotClass[r.status]}`} />
          <span className="text-[12px] font-semibold text-[#0a0a0a]">
            {hm(r.startedAt)} {dayLabel(r.startedAt)}
          </span>
          <span className="text-[11px] text-muted">
            {r.statusCode === 0 ? "no response" : r.statusCode}  •{" "}
            {r.duration === null ? "—" : `${(r.duration / 1000).toFixed(1)}s`}
          </span>
        </div>
      ))}
    </div>
  );
}
