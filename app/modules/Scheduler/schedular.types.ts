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
}
