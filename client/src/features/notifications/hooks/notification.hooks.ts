//Notification hooks — rules are per-job on the API, so everything fans out
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "../api/notification.api";
import type { CreateNotificationDTO } from "../api/notification.types";

export function useJobRules(jobId: number) {
  return useQuery({
    queryKey: ["notifications", jobId],
    queryFn: () => notificationApi.listByJob(jobId),
  });
}

//fan out over jobs, labeling each group with the job name
export function useAllRules(jobIds: number[], nameOf: (jobId: number) => string) {
  return useQuery({
    queryKey: ["notifications-all", jobIds],
    queryFn: async () => {
      const pages = await Promise.all(jobIds.map((id) => notificationApi.listByJob(id)));
      return jobIds.map((jobId, i) => ({
        jobId,
        name: nameOf(jobId),
        rules: pages[i],
      }));
    },
    enabled: jobIds.length > 0,
  });
}

function useInvalidateRules() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["notifications"] });
}

export function useCreateRule(jobId: number) {
  const invalidate = useInvalidateRules();
  return useMutation({
    mutationFn: (body: CreateNotificationDTO) => notificationApi.create(jobId, body),
    onSuccess: invalidate,
  });
}

export function useToggleRule() {
  const invalidate = useInvalidateRules();
  return useMutation({
    mutationFn: (notificationId: number) => notificationApi.toggle(notificationId),
    onSuccess: invalidate,
  });
}
