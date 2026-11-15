export interface userResponseDTO {
  id: number;
  jobId: number;
  status: "success" | "failed" | "running" | "timeout";
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  statusCode: number | null;
  error: string | null;
  //Added for the client: the Logs screen's Output box and the execution
  //detail modal render the stored response (headers + body)
  response: Record<string, unknown> | null;
}

//Aggregates for the Report page KPIs, computed over ALL history of one job.
//An execution row's status is its final outcome (retries reuse the same row),
//so failed = fired runs that exhausted retries / hit ENOTFOUND.
export interface ExecutionStatsDTO {
  jobId: number;
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
  //success share of TERMINAL runs (running rows excluded from the denominator)
  uptimePct: number | null;
  avgMs: number | null;
  minMs: number | null;
  maxMs: number | null;
  //latest terminal failure timestamp — drives "Down time" on the report
  lastFailureAt: Date | null;
  lastStatus: "success" | "failed" | "timeout" | "running" | null;
}

export interface queueResponse {
  executionId: number;
  statusCode: number;
  response: {
    headers: Record<string, unknown> | null;
    body: Record<string, unknown> | null;
  };
}
export interface updateDTO {
  status: "failed" | "success";
  error?: string | null;
  completedAt: Date;
  duration: number;
  statusCode: number;
  response: Record<string, unknown> | null;
}
