//Executions API — the backend exposes a single list endpoint
//(GET /api/executions?jobId=&page=&limit=); everything else on this screen
//derives from the rows
import { http, type Page } from "../../../shared/api/http";
import type { Execution, ExecutionStats } from "./execution.types";

export const executionApi = {
  list(jobId: number, page = 1): Promise<Page<Execution>> {
    return http.list<Execution>(`/api/executions?jobId=${jobId}&page=${page}`);
  },
  //GET /api/executions/stats — exact KPIs over ALL history of one job
  stats(jobId: number): Promise<ExecutionStats> {
    return http.get<ExecutionStats>(`/api/executions/stats?jobId=${jobId}`);
  },
};
