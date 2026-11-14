//Up-next queue — the soonest projected fires across all jobs.
//Presentational
import { formatIn } from "../../../shared/lib/format";
import { Card } from "../../../shared/ui/Card";
import type { Fire } from "../hooks/scheduled.hooks";

export function UpNext({ fires }: { fires: Fire[] }) {
  return (
    <Card className="flex flex-col gap-2 p-5">
      <p className="text-[13px] font-bold">Up next queue</p>
      {fires.length === 0 && (
        <p className="text-[13px] text-muted">Nothing scheduled this week.</p>
      )}
      {fires.map(({ at, name }, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-field border border-border p-3"
        >
          <span className="text-[12px] font-semibold">
            {at.toLocaleString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            — {name}
          </span>
          <span className="text-[11px] text-muted">in {formatIn(at.getTime() - Date.now())}</span>
        </div>
      ))}
    </Card>
  );
}
