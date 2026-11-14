//"Scheduled executions" tab — the next fires this cron will produce.
//Computed locally from the expression; the BullMQ delayed queue itself is
//not exposed over HTTP (the backend has no queue-contents endpoint)
import { CronExpressionParser } from "cron-parser";
import { formatIn } from "../../../shared/lib/format";
import { Card } from "../../../shared/ui/Card";

export function UpcomingRuns({ cron }: { cron: string }) {
  let items: Date[] = [];
  let error: string | null = null;
  try {
    const it = CronExpressionParser.parse(cron, { currentDate: new Date() });
    items = Array.from({ length: 8 }, () => it.next().toDate());
  } catch {
    error = "This cron expression can't be previewed.";
  }

  return (
    <Card className="flex flex-col gap-2 p-5">
      {error && <p className="text-[13px] text-danger">{error}</p>}
      {items.map((d, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-border py-2.5 last:border-0"
        >
          <span className="text-[12px] font-semibold">
            {d.toLocaleString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="text-[11px] text-muted">
            in {formatIn(d.getTime() - Date.now())}
          </span>
        </div>
      ))}
    </Card>
  );
}
