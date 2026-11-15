//Mirror of app/modules/Execution/execution.types.ts. statusCode 0 is the
//sentinel from D-12: the request never got a response (network/timeout/stale)
export interface Execution {
  id: number;
  jobId: number;
  status: "success" | "failed" | "running" | "timeout";
  startedAt: string;
  completedAt: string | null;
  duration: number | null;
  statusCode: number | null;
  error: string | null;
  response: Record<string, unknown> | null;
}

//Mirror of ExecutionStatsDTO — exact aggregates over ALL history of one job.
//An execution row's status is its final outcome (retries reuse the same row),
//so failedRuns counts only fires that exhausted retries / hit ENOTFOUND
export interface ExecutionStats {
  jobId: number;
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
  //success share of TERMINAL runs (running rows excluded from the denominator)
  uptimePct: number | null;
  avgMs: number | null;
  minMs: number | null;
  maxMs: number | null;
  lastFailureAt: string | null;
  lastStatus: Execution["status"] | null;
}
