export interface commonDates {
  updatedAt?: Date;
  createdAt?: Date;
  deletedAt?: Date | null;
}

export interface User extends commonDates {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
}

export interface Notification extends commonDates {
  id: number;
  type: "email" | "slack";
  event: "start" | "failure" | "success";
  enabled: boolean;
  channelId: string | null;
  jobId: number;
  target: string;
}
2;

export interface Execution extends commonDates {
  id?: number;
  jobId: number;
  status: "success" | "failed" | "running" | "timeout";
  startedAt: Date;
  statusCode: number | null;
  completedAt: Date | null;
  duration: number | null;
  error: string | null;
  response: Record<string, unknown> | null;
}

export interface Job extends commonDates {
  id?: number;
  userId: string;
  name: string;
  description: string | null;
  cronExpression: string;
  httpHeader: Record<string, string>;
  httpCommand: string;
  httpMethod: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  httpBody: Record<string, string | unknown>;
  isActive: boolean;
  maxRetries: number | 3;
  retryDelay: number | 50;
  timeout: number | 30000;
  lastRunAt: Date | null;
  nextRunAt: Date;
}
