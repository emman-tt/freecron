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
