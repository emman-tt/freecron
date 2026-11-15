//Scheduled hooks — projects every active job's cron over the next week
//(the BullMQ queue isn't exposed over HTTP, this is a preview)
import { useMemo } from "react";
import { CronExpressionParser } from "cron-parser";
import { useJobs } from "../../jobs/hooks/job.hooks";

const DAYS = 7;

export interface Fire {
  at: Date;
  name: string;
}

export function useScheduledWeek() {
  const jobs = useJobs({ isActive: true }, 1);

  const week = useMemo(() => {
    const now = new Date();
    const perDay: Fire[][] = Array.from({ length: DAYS }, () => []);
    for (const job of jobs.data?.data ?? []) {
      try {
        const it = CronExpressionParser.parse(job.cronExpression, { currentDate: now });
        //Hard cap per job so a * * * * * job can't flood the projection
        for (let i = 0; i < 200; i++) {
          const at = it.next().toDate();
          const day = Math.floor((at.getTime() - startOfDay(now)) / 86_400_000);
          if (day >= DAYS) break;
          if (day >= 0) perDay[day].push({ at, name: job.name });
        }
      } catch {
        //Invalid cron on an active job — skip it; the Jobs page surfaces it
      }
    }
    return perDay.map((fires) => fires.sort((a, b) => a.at.getTime() - b.at.getTime()));
  }, [jobs.data]);

  const labels = useMemo(
    () =>
      Array.from({ length: DAYS }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return {
          title: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" }),
          count: week[i]?.length ?? 0,
        };
      }),
    [week],
  );

  return {
    loading: jobs.isLoading,
    labels,
    week,
    upNext: week.flat().slice(0, 6),
  };
}

function startOfDay(d: Date): number {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}
