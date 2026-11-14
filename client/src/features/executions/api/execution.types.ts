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
