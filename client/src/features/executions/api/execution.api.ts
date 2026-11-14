//Executions API — the backend exposes a single list endpoint
//(GET /api/executions?jobId=&page=&limit=); everything else on this screen
//derives from the rows
import { http, type PaginationMeta } from "../../../shared/api/http";
import type { Execution } from "./execution.types";

type Page<T> = { data: T[]; meta: PaginationMeta };

export const executionApi = {
  list(jobId: number, page = 1): Promise<Page<Execution>> {
    return http.get(`/api/executions?jobId=${jobId}&page=${page}`);
  },
};
