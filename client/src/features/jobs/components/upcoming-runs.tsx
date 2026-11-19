//"Scheduled" tab — the next fires this cron will produce. Computed locally
//from the expression; the BullMQ delayed queue itself is not exposed over
//HTTP (the backend has no queue-contents endpoint).
import { CronExpressionParser } from "cron-parser";
import { formatIn } from "../../../shared/lib/format";

export function UpcomingRuns({ cron, now }: { cron: string; now: number }) {
  let items: Date[] = [];
  let error: string | null = null;
  try {
    const it = CronExpressionParser.parse(cron, { currentDate: new Date(now) });
    items = Array.from({ length: 8 }, () => it.next().toDate());
  } catch {
    error = "This cron expression can't be previewed.";
  }

  return (
    <section className="flex flex-col gap-3 rounded-[16px] border border-border/80 bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[16px] font-bold text-ink">
          Upcoming runs <span className="font-medium text-muted">· next 8</span>
        </p>
        <p className="text-[12px] text-muted">Computed from the cron expression</p>
      </div>

      {error && <p className="text-[13px] text-danger">{error}</p>}

      {items.map((date, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-border/80 py-2.5 last:border-0"
        >
          <span className="w-5 text-[11px] font-semibold text-muted">{i + 1}</span>
          <span className="text-[13px] font-semibold text-ink">
            {date.toLocaleString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="ml-auto text-[11.5px] text-muted">
            in {formatIn(date.getTime() - now)}
          </span>
        </div>
      ))}
    </section>
  );
}
