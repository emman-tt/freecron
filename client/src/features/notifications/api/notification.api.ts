//Notifications API — per-job alert rules (email / slack on start · failure ·
//success). Field names mirror notification.types.ts and the controller schema
import { http } from "../../../shared/api/http";
import type { CreateNotificationDTO, Notification } from "./notification.types";

export const notificationApi = {
  //GET requires jobId — there is no "all my rules" endpoint
  listByJob: (jobId: number) => http.get<Notification[]>(`/api/notifications?jobId=${jobId}`),
  create: (jobId: number, body: CreateNotificationDTO) =>
    http.post<Notification>("/api/notifications", { ...body, jobId }),
  //PATCH flips enabled server-side (no body) — "On/Off without delete"
  toggle: (notificationId: number) =>
    http.patch<Notification>(`/api/notifications/${notificationId}`),
  delete: (notificationId: number) =>
    http.delete<Notification>(`/api/notifications/${notificationId}`),
};
