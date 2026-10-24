export interface userResponseDTO {
  id: number;
  jobId: number;
  status: "success" | "failed" | "running" | "timeout";
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  //   error: string | null;
  //   response: Record<string, unknown>;
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
