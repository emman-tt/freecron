//Execution hooks — the list polls lightly because a "running" row becomes
//terminal within seconds of the fetch
import { useQuery } from "@tanstack/react-query";
import { executionApi } from "../api/execution.api";

export function useExecutions(jobId: number, page: number) {
  return useQuery({
    queryKey: ["executions", String(jobId), page],
    queryFn: () => executionApi.list(jobId, page),
    refetchInterval: 10_000,
  });
}

//Exact KPIs over all history (GET /api/executions/stats). Key nests under
//["executions"] so the run-now/list invalidations refresh it too; same light
//polling because lastStatus flips from "running" to terminal within seconds
export function useExecutionStats(jobId: number) {
  return useQuery({
    queryKey: ["executions", "stats", String(jobId)],
    queryFn: () => executionApi.stats(jobId),
    //no job yet (empty dashboard) → don't hit /stats?jobId=0
    enabled: jobId > 0,
    refetchInterval: 10_000,
  });
}
