//Job hooks — every query and mutation for jobs lives here, so pages compose
//hooks and components stay presentational. All mutations share one
//invalidation: the jobs lists and any open job detail
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jobApi } from "../api/job.api";
import type { CreateJobDTO, JobFilters, UpdateJobDTO } from "../api/job.types";

export function useJobs(filters: JobFilters, page: number) {
  return useQuery({
    queryKey: ["jobs", filters, page],
    queryFn: () => jobApi.list(filters, page),
  });
}

export function useJob(jobId: number, enabled = true) {
  return useQuery({
    queryKey: ["job", String(jobId)],
    queryFn: () => jobApi.get(jobId),
    enabled,
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

//POST /:jobId — run now, priority-1 BullMQ job; executions change too
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

//POST (create) or PUT (edit) — the form calls this after its own client-side
//validation, which mirrors the backend's Zod messages verbatim
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
