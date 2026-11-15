//Jobs API — verbs mirror job.routes.ts one line at a time
import { http, type Page } from "../../../shared/api/http";
import type { CreateJobDTO, Job, JobFilters, JobStats, UpdateJobDTO } from "./job.types";

export const jobApi = {
  //GET /api/jobs — filters are flat query params; list keeps { data, meta }
  list(filters: JobFilters, page = 1): Promise<Page<Job>> {
    const q = new URLSearchParams({ page: String(page) });
    if (filters.name) q.set("name", filters.name);
    if (filters.isActive !== undefined)
      q.set("isActive", String(filters.isActive));
    if (filters.httpMethod) q.set("httpMethod", filters.httpMethod);
    return http.list<Job>(`/api/jobs?${q}`);
  },
  get: (jobId: number) => http.get<Job>(`/api/jobs/${jobId}`),
  create: (body: CreateJobDTO) => http.post<Job>("/api/jobs", body),
  update: (jobId: number, body: UpdateJobDTO) =>
    http.put<Job>(`/api/jobs/${jobId}`, body),
  //PATCH toggles pause/resume · POST runs now (priority-1 BullMQ job)
  toggle: (jobId: number) => http.patch<Job>(`/api/jobs/${jobId}`),
  runNow: (jobId: number) => http.post<Job>(`/api/jobs/${jobId}`),
  delete: (jobId: number) => http.delete<Job>(`/api/jobs/${jobId}`),
  //GET /api/jobs/stats — one aggregate call for the dashboard stat cards
  stats: () => http.get<JobStats>("/api/jobs/stats"),
};
