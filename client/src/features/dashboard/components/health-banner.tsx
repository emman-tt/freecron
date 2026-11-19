//Health banner — one honest sentence about the fleet. Amber when something
//needs a look, green when nothing does. Every number comes from the stats
//endpoints; nothing is invented.
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { Job, JobStats } from "../../jobs/api/job.types";
import type { ExecutionStats } from "../../executions/api/execution.types";
import { dayLabel } from "../../../shared/lib/format";

export function HealthBanner({
  stats,
  job,
  jobStats,
}: {
  stats?: JobStats;
  job?: Job;
  jobStats?: ExecutionStats;
}) {
  if (!stats) return null;

  const warn = (text: string) => (
    <div className="flex items-start gap-2.5 rounded-[12px] border border-warning-border bg-warning-soft px-4 py-3 text-[13px] text-[#6b4e0f]">
      <AlertTriangle size={16} className="mt-px shrink-0 text-warning" />
      <p>
        <span className="font-semibold text-warning">Check this: </span>
        {text}
      </p>
    </div>
  );

  if (job && jobStats && jobStats.failedRuns > 0) {
    const last = jobStats.lastFailureAt
      ? ` Last failure ${dayLabel(jobStats.lastFailureAt)}.`
      : "";
    return warn(
      `${job.name} failed ${jobStats.failedRuns} of ${jobStats.totalRuns} runs after retries.${last}`,
    );
  }

  if (stats.failedRuns > 0) {
    return warn(
      `${stats.failedRuns} failed ${stats.failedRuns === 1 ? "run" : "runs"} across all jobs. Open Jobs to see which ones need care.`,
    );
  }

  if (stats.totalJobs === 0) {
    return (
      <div className="flex items-start gap-2.5 rounded-[12px] border border-border bg-card px-4 py-3 text-[13px] text-muted">
        <Info size={16} className="mt-px shrink-0" />
        <p>No jobs yet — add a cron job and FreeCron starts tracking every fire.</p>
      </div>
    );
  }

  if (stats.activeJobs === 0) {
    return warn("Every job is paused. Nothing will fire until you resume one.");
  }

  return (
    <div className="flex items-start gap-2.5 rounded-[12px] border border-[#cdebd8] bg-success-soft px-4 py-3 text-[13px] text-success-strong">
      <CheckCircle2 size={16} className="mt-px shrink-0" />
      <p>
        <span className="font-semibold">All clear: </span>
        {stats.activeJobs} {stats.activeJobs === 1 ? "job is" : "jobs are"} running
        {stats.pausedJobs > 0 ? `, ${stats.pausedJobs} paused` : ""} — no exhausted retries.
      </p>
    </div>
  );
}
