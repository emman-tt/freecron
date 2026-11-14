//Mirror of app/modules/Notification/notification.types.ts
export type NotificationType = "email" | "slack";
export type NotificationEvent = "start" | "failure" | "success";

export interface Notification {
  id: number;
  jobId: number;
  type: NotificationType;
  event: NotificationEvent;
  target: string;
  enabled: boolean;
}

export interface CreateNotificationDTO {
  type: NotificationType;
  event: NotificationEvent;
  target: string;
}
