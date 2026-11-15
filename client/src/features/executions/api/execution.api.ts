//Executions API — the backend exposes a single list endpoint
//(GET /api/executions?jobId=&page=&limit=); everything else on this screen
//derives from the rows
import { http, type Page } from "../../../shared/api/http";
import type { Execution, ExecutionStats } from "./execution.types";

export const executionApi = {
  //limit omitted → backend default (the Logs table's pagination); the chart
  //passes a larger window for its 30-bar history
  list(jobId: number, page = 1, limit?: number): Promise<Page<Execution>> {
    const q = new URLSearchParams({ jobId: String(jobId), page: String(page) });
    if (limit !== undefined) q.set("limit", String(limit));
    return http.list<Execution>(`/api/executions?${q}`);
  },
  //GET /api/executions/stats — exact KPIs over ALL history of one job
  stats(jobId: number): Promise<ExecutionStats> {
    return http.get<ExecutionStats>(`/api/executions/stats?jobId=${jobId}`);
  },
};
