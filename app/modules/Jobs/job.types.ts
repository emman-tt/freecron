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
  isActive: boolean;
  lastRunAt: Date | null;
  nextRunAt: Date;
}

export interface JobFilters {
  isActive?: boolean | undefined;
  httpMethod?: "POST" | "GET" | "PATCH" | "PUT" | "DELETE" | undefined;
  name?: string | undefined;
}
