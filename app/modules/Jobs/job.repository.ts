import { Job, User } from "../../database/db.schema.js";
import db from "../../database/db.config.js";
import { and, count, desc, eq, gt, ilike, lt, lte, sql } from "drizzle-orm";
import type { createJobDTO, JobFilters, updateJobDTO } from "./job.types.js";

import { JOB_DEFUALTS } from "./job.defaults.js";

export class JobRespository {
  async findById(id: number) {
    const [found] = await db.select().from(Job).where(eq(Job.id, id));
    return found;
  }
  async findOneAndJoinUser(id: number) {
    const [found] = await db
      .select()
      .from(Job)
      .where(eq(Job.id, id))
      .innerJoin(User, eq(Job.userId, User.id));
    return found;
  }

  async findAllByUser(
    userId: string,
    limit: number,
    offset: number,
    filters: JobFilters = {},
  ) {
    return await db
      .select()
      .from(Job)
      .where(and(...this.filterConditions(userId, filters)))
      .orderBy(desc(Job.id))
      .limit(limit)
      .offset(offset);
  }

  async countByUser(userId: string, filters: JobFilters = {}): Promise<number> {
    const [row] = await db
      .select({ total: count() })
      .from(Job)
      .where(and(...this.filterConditions(userId, filters)));

    return row?.total ?? 0;
  }

  private filterConditions(userId: string, filters: JobFilters) {
    const conds = [eq(Job.userId, userId)];

    if (filters.isActive !== undefined) {
      conds.push(eq(Job.isActive, filters.isActive));
    }
    if (filters.httpMethod !== undefined) {
      conds.push(eq(Job.httpMethod, filters.httpMethod));
    }
    if (filters.name !== undefined) {
      conds.push(ilike(Job.name, `%${this.escapeLike(filters.name)}%`));
    }

    return conds;
  }

  private escapeLike(value: string): string {
    return value
      .replace(/\\/g, "\\\\")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");
  }

  async findDueJobs(nowDate: Date) {
    return await db
      .select()
      .from(Job)
      .where(and(eq(Job.isActive, true), lte(Job.nextRunAt, nowDate)));
  }

  async toggleActive(id: number) {
    const [updatedJob] = await db
      .update(Job)
      .set({
        isActive: sql`NOT "isActive"`,
      })
      .where(eq(Job.id, id))
      .returning();

    return updatedJob;
  }

  async delete(id: number) {
    const [deleted] = await db.delete(Job).where(eq(Job.id, id)).returning();
    return deleted
  }

  async updateRunTimes(id: number, lastRunAt: Date, nextRunAt: Date) {
    const [updatedJob] = await db
      .update(Job)
      .set({
        lastRunAt: lastRunAt,
        nextRunAt: nextRunAt,
      })
      .where(eq(Job.id, id))
      .returning();

    return updatedJob;
  }

  async update(id: number, updateDTO: updateJobDTO) {
    const updateData: Record<string, any> = {};
    let length = 0;

    for (const [key, value] of Object.entries(updateDTO)) {
      if (value !== undefined) {
        length++;
        updateData[key] = value;
      }
    }
    if (!length) {
      return await db.select().from(Job).where(eq(Job.id, id));
    }

    const updatedJob = await db
      .update(Job)
      .set(updateData)
      .where(eq(Job.id, id))
      .returning();
    return updatedJob;
  }

  async create(
    data: createJobDTO,
    userId: string,
    nextRunAt: Date,
    lastRunAt: Date | null,
  ) {
    const [createdJob] = await db
      .insert(Job)
      .values({
        name: data.name,
        cronExpression: data.cronExpression,
        userId: userId,
        httpCommand: data.httpCommand,
        description: data.description ?? JOB_DEFUALTS.description,
        httpBody: data.httpBody ?? JOB_DEFUALTS.httpBody,
        httpMethod: data.httpMethod ?? JOB_DEFUALTS.httpMethod,
        httpHeader: data.httpHeader ?? JOB_DEFUALTS.httpHeader,
        maxRetries: JOB_DEFUALTS.maxRetries,
        retryDelay: JOB_DEFUALTS.retryDelay,
        timeout: JOB_DEFUALTS.timeout,
        isActive: JOB_DEFUALTS.isActive,
        nextRunAt: nextRunAt,
        lastRunAt: lastRunAt,
      })
      .returning();

    return createdJob;
  }
}

export const jobRepo = new JobRespository();
