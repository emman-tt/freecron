//Executions API — list + all-history stats
import { http, type Page } from "../../../shared/api/http";
import type { Execution, ExecutionStats } from "./execution.types";

export const executionApi = {
  //limit omitted → backend default (the Logs table's pagination)
  list(jobId: number, page = 1, limit?: number): Promise<Page<Execution>> {
    const q = new URLSearchParams({ jobId: String(jobId), page: String(page) });
    if (limit !== undefined) q.set("limit", String(limit));
    return http.list<Execution>(`/api/executions?${q}`);
  },
  stats(jobId: number): Promise<ExecutionStats> {
    return http.get<ExecutionStats>(`/api/executions/stats?jobId=${jobId}`);
  },
};
