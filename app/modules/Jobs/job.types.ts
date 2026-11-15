export interface createJobDTO {
  name: string;
  description: string | null;
  cronExpression: string;
  httpHeader: Record<string, string>;
  httpCommand: string;
  httpMethod: "POST" | "GET" | "PATCH" | "PUT" | "DELETE";
  httpBody: Record<string, string | unknown>;
}

export interface updateJobDTO {
  name?: string | undefined;
  description?: string | null | undefined;
  cronExpression?: string | undefined;
  httpHeader?: Record<string, string | unknown> | undefined;
  httpCommand?: string | undefined;
  httpMethod?: "POST" | "GET" | "PATCH" | "PUT" | "DELETE" | undefined;
  httpBody?: Record<string, string | unknown> | undefined;
  timeout?: number | undefined;
  isActive?: boolean | undefined;
  lastRunAt?: Date | undefined;
}

export interface jobResponseDTO {
  id: number;
  name: string;
  description: string | null;
  cronExpression: string;
  httpCommand: string;
  httpMethod: string;
  //Added for the client: the Edit form and Overview card render headers,
  //payload and timeout, which the original DTO kept server-side only
  httpHeader: Record<string, string>;
  httpBody: Record<string, unknown>;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  isActive: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date;
}

export interface JobFilters {
  isActive?: boolean | undefined;
  httpMethod?: "POST" | "GET" | "PATCH" | "PUT" | "DELETE" | undefined;
  name?: string | undefined;
}

//Aggregates for the dashboard stat cards, scoped to one user's jobs.
//failedRuns/avgRuntimeMs follow the same "final outcome only" semantics as
//ExecutionStatsDTO — retries reuse the execution row, so terminal status IS
//the outcome.
export interface JobStatsDTO {
  totalJobs: number;
  activeJobs: number;
  pausedJobs: number;
  //jobs created in the trailing 7 days — drives the "+N this week" sub
  createdThisWeek: number;
  failedRuns: number;
  avgRuntimeMs: number | null;
}
