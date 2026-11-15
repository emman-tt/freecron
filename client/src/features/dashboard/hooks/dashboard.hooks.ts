//Dashboard hooks — one jobs/stats aggregate + the selected job's details
import { useState } from "react";
import { useJob, useJobs, useJobStats, useToggleJob } from "../../jobs/hooks/job.hooks";
import { useExecutions, useExecutionStats } from "../../executions/hooks/execution.hooks";

export function useDashboard() {
  const [selected, setSelected] = useState<number | null>(null);

  const jobs = useJobs({}, 1);
  const stats = useJobStats();

  //selection defaults to the first job
  const rows = jobs.data?.data ?? [];
  const currentId = selected ?? rows[0]?.id;
  const detail = useJob(currentId ?? 0);
  const recent = useExecutions(currentId ?? 0, 1);
  const currentStats = useExecutionStats(currentId ?? 0);
  const toggle = useToggleJob();

  return {
    rows,
    stats: stats.data,
    currentStats: currentStats.data,
    detail: detail.data,
    recent: recent.data?.data ?? [],
    currentId,
    setSelected,
    toggle,
  };
}
