//Mirror of app/modules/Execution/execution.types.ts. statusCode 0 = the
//request never got a response (network/timeout/stale)
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

//Mirror of ExecutionStatsDTO — aggregates over ALL history of one job;
//failed = exhausted retries only (retries reuse the execution row)
export interface ExecutionStats {
  jobId: number;
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
  uptimePct: number | null;
  avgMs: number | null;
  minMs: number | null;
  maxMs: number | null;
  lastFailureAt: string | null;
  lastStatus: Execution["status"] | null;
}
