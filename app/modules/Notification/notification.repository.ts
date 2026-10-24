import { Notification } from "../../database/db.schema.js";
import db from "../../database/db.config.js";
import { and, count, desc, eq, sql } from "drizzle-orm";
import type {
  createNotificationDTO,
  updateNotificationDTO,
} from "./notification.types.js";
import { NOTIFICATION_DEFAULTS } from "./notification.defaults.js";

export class NotificationRepository {
  async findById(id: number) {
    const [found] = await db
      .select()
      .from(Notification)
      .where(eq(Notification.id, id));
    return found;
  }
  // async findByJobId(jobId: number) {
  //   const [found] = await db
  //     .select()
  //     .from(Notification)
  //     .where(eq(Notification.jobId, jobId));
  //   return found;
  // }

  async findAllByJobIdAndEvent(
    jobId: number,
    event: "start" | "failure" | "success",
  ) {
    return await db
      .select()
      .from(Notification)
      .where(and(eq(Notification.jobId, jobId), eq(Notification.event, event)));
  }

  async findAllByJobId(jobId: number, limit: number, offset: number) {
    return await db
      .select()
      .from(Notification)
      .where(eq(Notification.jobId, jobId))
      .orderBy(desc(Notification.id))
      .limit(limit)
      .offset(offset);
  }

  async countByJobId(jobId: number): Promise<number> {
    const [row] = await db
      .select({ total: count() })
      .from(Notification)
      .where(eq(Notification.jobId, jobId));

    return row?.total ?? 0;
  }

  async toggleEnabled(id: number) {
    const [updated] = await db
      .update(Notification)
      .set({
        enabled: sql`NOT "enabled"`,
      })
      .where(eq(Notification.id, id))
      .returning();

    return updated;
  }

  async delete(id: number) {
    await db.delete(Notification).where(eq(Notification.id, id));
  }

  async update(id: number, updateDTO: updateNotificationDTO) {
    const updateData: Record<string, any> = {};
    let length = 0;

    for (const [key, value] of Object.entries(updateDTO)) {
      if (value !== undefined) {
        length++;
        updateData[key] = value;
      }
    }
    if (!length) {
      return await db
        .select()
        .from(Notification)
        .where(eq(Notification.id, id));
    }

    const updated = await db
      .update(Notification)
      .set(updateData)
      .where(eq(Notification.id, id))
      .returning();
    return updated;
  }

  async create(data: createNotificationDTO, jobId: number) {
    const [created] = await db
      .insert(Notification)
      .values({
        type: data.type,
        event: data.event,
        target: data.target,
        enabled: data.enabled ?? NOTIFICATION_DEFAULTS.enabled,
        jobId: jobId,
        channelId: data.channelId,
      })
      .returning();

    return created;
  }
}

export const notificationRepo = new NotificationRepository();
