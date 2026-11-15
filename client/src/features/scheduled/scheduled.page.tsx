//Scheduled executions page — week view + up-next queue, all from the hook's
//projection of each active job's cron
import { useScheduledWeek } from "./hooks/scheduled.hooks";
import { WeekCalendar } from "./components/week-calendar";
import { UpNext } from "./components/up-next";

export function ScheduledPage() {
  const { loading, labels, week, upNext } = useScheduledWeek();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-[28px] font-bold text-[#0a0a0a]">Scheduled executions</h1>
        <p className="text-[13px] text-muted">
          Queue preview from cronExpression → nextRunAt  •  timezone: your browser's
        </p>
      </div>

      {loading && <p className="text-[13px] text-muted">Loading schedule…</p>}

      {!loading && <WeekCalendar labels={labels} total={week.flat().length} />}
      {!loading && <UpNext fires={upNext} />}
    </div>
  );
}
