//Executions API — the backend exposes a single list endpoint
//(GET /api/executions?jobId=&page=&limit=); everything else on this screen
//derives from the rows
import { http, type Page } from "../../../shared/api/http";
import type { Execution } from "./execution.types";

export const executionApi = {
  list(jobId: number, page = 1): Promise<Page<Execution>> {
    return http.list<Execution>(`/api/executions?jobId=${jobId}&page=${page}`);
  },
};
