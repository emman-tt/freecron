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
