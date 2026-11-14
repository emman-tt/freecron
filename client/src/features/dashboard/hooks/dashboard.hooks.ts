//Dashboard hooks — stats + selected job's details. Stats only claim what the
//API can prove (total / active / paused); "Failed" and "Avg runtime" need
//backend aggregates that don't exist yet, so they're absent rather than faked
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { jobApi } from "../../jobs/api/job.api";
import { useJob, useJobs, useToggleJob } from "../../jobs/hooks/job.hooks";
import { useExecutions } from "../../executions/hooks/execution.hooks";

export function useDashboard() {
  const [selected, setSelected] = useState<number | null>(null);

  const jobs = useJobs({}, 1);
  const active = useQuery({
    queryKey: ["jobs", { isActive: true }, 1],
    queryFn: () => jobApi.list({ isActive: true }, 1),
  });
  const paused = useQuery({
    queryKey: ["jobs", { isActive: false }, 1],
    queryFn: () => jobApi.list({ isActive: false }, 1),
  });

  //Details card follows the design: selection defaults to the first job
  const rows = jobs.data?.data ?? [];
  const currentId = selected ?? rows[0]?.id;
  const detail = useJob(currentId ?? 0, currentId !== undefined);
  const recent = useExecutions(currentId ?? 0, 1);
  const toggle = useToggleJob();

  return {
    rows,
    stats: {
      total: jobs.data?.meta.total,
      active: active.data?.meta.total,
      paused: paused.data?.meta.total,
    },
    detail: detail.data,
    recent: recent.data?.data ?? [],
    currentId,
    setSelected,
    toggle,
  };
}
