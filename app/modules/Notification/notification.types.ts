export type NotificationType = "email" | "slack";
export type NotificationEvent = "start" | "failure" | "success";

export interface createNotificationDTO {
  type: NotificationType;
  event: NotificationEvent;
  // Email address when type is "email", webhook URL when "slack".
  // Stored in the `target` column.
  target: string;
  channelId: string | null;
  enabled?: boolean | undefined;
}

export interface updateNotificationDTO {
  type?: NotificationType | undefined;
  event?: NotificationEvent | undefined;
  target?: string | undefined;
  enabled?: boolean | undefined;
}

export interface notificationResponseDTO {
  id: number;
  jobId: number;
  type: NotificationType;
  event: NotificationEvent;
  target: string;
  enabled: boolean;
}

export interface queueDTO {
  notificationId: string;
  userId: string;
  executionId: number;
  event: NotificationEvent;
  // priority: number;
  // delay: number;
}
