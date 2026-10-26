export interface queueResponse {
  jobId: string;
  userId: string;
  executionId: number | null;
  statusCode: number | null;
  response: {
    headers: Record<string, unknown> | null;
    body: Record<string, unknown> | null;
  };
}

export interface queueDTO {
  jobId: string;
  userId: string;
  priority: number;
  delay: number;
  //Unique bull job id per trigger. Required when several triggers may exist
  //for one DB job (e.g. run-now) — bull dedupes on the id argument, so a
  //second add under the same value would be swallowed by the scheduled
  //delayed job instead of running immediately
  triggerId?: string;
}
