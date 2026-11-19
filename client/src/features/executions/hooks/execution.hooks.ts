//Execution hooks — 10s polling: a "running" row turns terminal within seconds
import { useQuery } from "@tanstack/react-query";
import { executionApi } from "../api/execution.api";

export function useExecutions(jobId: number, page: number, limit?: number) {
  return useQuery({
    queryKey: ["executions", String(jobId), page, limit ?? null],
    queryFn: () => executionApi.list(jobId, page, limit),
    refetchInterval: 10_000,
    //no job selected → don't hit /api/executions?jobId=0
    enabled: jobId > 0,
  });
}

//All-history KPIs (GET /api/executions/stats); nests under ["executions"]
export function useExecutionStats(jobId: number) {
  return useQuery({
    queryKey: ["executions", "stats", String(jobId)],
    queryFn: () => executionApi.stats(jobId),
    enabled: jobId > 0,
    refetchInterval: 10_000,
  });
}
