//Notifications API — per-job alert rules (email / slack)
import { http } from "../../../shared/api/http";
import type { CreateNotificationDTO, Notification } from "./notification.types";

export const notificationApi = {
  //GET requires jobId — no "all my rules" endpoint
  listByJob: (jobId: number) => http.get<Notification[]>(`/api/notifications?jobId=${jobId}`),
  create: (jobId: number, body: CreateNotificationDTO) =>
    http.post<Notification>("/api/notifications", { ...body, jobId }),
  //PATCH flips enabled server-side, no body
  toggle: (notificationId: number) =>
    http.patch<Notification>(`/api/notifications/${notificationId}`),
  delete: (notificationId: number) =>
    http.delete<Notification>(`/api/notifications/${notificationId}`),
};
