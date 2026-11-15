//Mirror of app/modules/Jobs/job.types.ts — field names must match the API
export type HttpMethod = "POST" | "GET" | "PATCH" | "PUT" | "DELETE";

export interface Job {
  id: number;
  name: string;
  description: string | null;
  cronExpression: string;
  httpCommand: string;
  httpMethod: HttpMethod;
  httpHeader: Record<string, string>;
  httpBody: Record<string, unknown>;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string;
}

export interface JobFilters {
  name?: string;
  isActive?: boolean;
  httpMethod?: HttpMethod;
}

export interface CreateJobDTO {
  name: string;
  description: string | null;
  cronExpression: string;
  httpCommand: string;
  httpMethod: HttpMethod;
  httpHeader: Record<string, string>;
  httpBody: Record<string, unknown>;
}

export type UpdateJobDTO = Partial<CreateJobDTO> & { isActive?: boolean };

export interface JobStats {
  totalJobs: number;
  activeJobs: number;
  pausedJobs: number;
  //jobs created in the trailing 7 days
  createdThisWeek: number;
  failedRuns: number;
  avgRuntimeMs: number | null;
}
