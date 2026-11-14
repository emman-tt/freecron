//Week calendar — one day-cell per day; the first (today) renders dark with
//white text, per the design. Presentational
import { Card } from "../../../shared/ui/Card";

export function WeekCalendar({
  labels,
  total,
}: {
  labels: Array<{ title: string; count: number }>;
  total: number;
}) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <p className="text-[13px] font-bold">
        {labels[0].title} – {labels[labels.length - 1].title} · {total} runs due
      </p>
      <div className="grid grid-cols-7 gap-2">
        {labels.map((d, i) => (
          <div
            key={i}
            className={`flex flex-col gap-1 rounded-field p-3 ${
              i === 0 ? "bg-primary text-white" : "bg-muted-bg"
            }`}
          >
            <span className="text-[11px] font-bold">{d.title}</span>
            <span className={`text-[11px] ${i === 0 ? "text-white/80" : "text-muted"}`}>
              {d.count} job{d.count === 1 ? "" : "s"}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
