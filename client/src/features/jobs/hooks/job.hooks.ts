//Job hooks — queries + mutations; mutations invalidate ["jobs"] + ["job"]
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jobApi } from "../api/job.api";
import type { CreateJobDTO, JobFilters, UpdateJobDTO } from "../api/job.types";

export function useJobs(filters: JobFilters, page: number) {
  return useQuery({
    queryKey: ["jobs", filters, page],
    queryFn: () => jobApi.list(filters, page),
  });
}

//Dashboard stat-card aggregates (GET /api/jobs/stats); nests under ["jobs"]
export function useJobStats() {
  return useQuery({
    queryKey: ["jobs", "stats"],
    queryFn: () => jobApi.stats(),
  });
}

export function useJob(jobId: number) {
  return useQuery({
    queryKey: ["job", String(jobId)],
    queryFn: () => jobApi.get(jobId),
    //no job yet (create form / empty dashboard) → don't hit /api/jobs/0
    enabled: jobId > 0,
  });
}

function useInvalidateJobs() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["jobs"] });
    queryClient.invalidateQueries({ queryKey: ["job"] });
  };
}

//PATCH /:jobId — pause/resume
export function useToggleJob() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: (jobId: number) => jobApi.toggle(jobId),
    onSuccess: invalidate,
  });
}

//POST /:jobId — run now; executions change too
export function useRunNow() {
  const invalidate = useInvalidateJobs();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: number) => jobApi.runNow(jobId),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["executions"] });
    },
  });
}

export function useDeleteJob() {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: (jobId: number) => jobApi.delete(jobId),
    onSuccess: invalidate,
  });
}

//POST (create) or PUT (edit)
export function useSaveJob(jobId?: number) {
  const invalidate = useInvalidateJobs();
  return useMutation({
    mutationFn: (body: CreateJobDTO) =>
      jobId === undefined
        ? jobApi.create(body)
        : jobApi.update(jobId, body as UpdateJobDTO),
    onSuccess: invalidate,
  });
}
