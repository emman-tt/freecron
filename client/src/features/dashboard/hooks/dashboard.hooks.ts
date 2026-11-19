//Dashboard hooks — jobs + stats aggregates, the selected job's detail, and a
//48-run window for the strip. Everything downstream of the selection is
//disabled while nothing is selected, so we never call /jobs/0.
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
  const recent = useExecutions(currentId ?? 0, 1, 48);
  const currentStats = useExecutionStats(currentId ?? 0);
  const toggle = useToggleJob();

  return {
    rows,
    stats: stats.data,
    statsUpdatedAt: stats.dataUpdatedAt,
    loading: jobs.isLoading,
    error: jobs.isError ? (jobs.error as Error) : null,
    refetch: jobs.refetch,
    currentStats: currentStats.data,
    detail: detail.data,
    detailLoading: detail.isLoading,
    recent: recent.data?.data ?? [],
    currentId,
    setSelected,
    toggle,
  };
}
