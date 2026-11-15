import db from "../../database/db.config.js";
import { Execution } from "../../database/db.schema.js";
import type { Execution as ExecutionType } from "../../shared/types/entities.js";
import { and, count, desc, eq, lt, sql } from "drizzle-orm";
import type { updateDTO } from "./execution.types.js";

export const STALE_RUNNING_WINDOW_MS = 15 * 60 * 1000;
export const STALE_RUNNING_ERROR =
  "stale running — worker died before terminal write";

export class ExecutionRespository {
  //Create a new execution record
  async create(executeEntity: ExecutionType) {
    const [entity] = await db
      .insert(Execution)
      .values({
        ...executeEntity,
      })
      .returning();

    return entity;
  }

  //Finding a record by  id of the execution row
  async findById(id: number) {
    const [entity] = await db
      .select()
      .from(Execution)
      .where(eq(Execution.id, id));
    return entity;
  }

  //Finding all execution records by job id
  async findAllByJobId(id: number, limit: number, offset: number) {
    return await db
      .select()
      .from(Execution)
      .where(eq(Execution.jobId, id))
      .orderBy(desc(Execution.startedAt), desc(Execution.id))
      .limit(limit)
      .offset(offset);
  }

  async countByJobId(id: number): Promise<number> {
    const [row] = await db
      .select({ total: count() })
      .from(Execution)
      .where(eq(Execution.jobId, id));

    return row?.total ?? 0;
  }

  //Update status in execution
  async update(data: updateDTO, id: number) {
    const [entity] = await db
      .update(Execution)
      .set({
        status: data.status,
        error: data.error,
        statusCode: data.statusCode,
        response: data.response,
        completedAt: data.completedAt,
        duration: data.duration,
      })
      .where(eq(Execution.id, id))
      .returning();

    return entity;
  }

  //Aggregates over one job's full history, plus its latest row's status.
  //SQL FILTER keeps it a single scan; count/avg arrive as strings from pg,
  //mapWith(Number) coerces them at the driver boundary.
  async statsByJobId(id: number) {
    const [aggregates] = await db
      .select({
        totalRuns: count(),
        successRuns:
          sql<number>`COUNT(*) FILTER (WHERE ${Execution.status} = 'success')`.mapWith(
            Number,
          ),
        failedRuns:
          sql<number>`COUNT(*) FILTER (WHERE ${Execution.status} IN ('failed', 'timeout'))`.mapWith(
            Number,
          ),
        avgMs: sql<
          number | null
        >`AVG(${Execution.duration}) FILTER (WHERE ${Execution.duration} IS NOT NULL)`.mapWith(
          Number,
        ),
        minMs: sql<number | null>`MIN(${Execution.duration})`.mapWith(Number),
        maxMs: sql<number | null>`MAX(${Execution.duration})`.mapWith(Number),
        lastFailureAt: sql<Date | null>`MAX(${Execution.startedAt}) FILTER (WHERE ${Execution.status} IN ('failed', 'timeout'))`,
      })
      .from(Execution)
      .where(eq(Execution.jobId, id));

    //lastStatus = the most recent scheduled fire, whatever its state
    const [latest] = await db
      .select({ status: Execution.status })
      .from(Execution)
      .where(eq(Execution.jobId, id))
      .orderBy(desc(Execution.startedAt), desc(Execution.id))
      .limit(1);

    return { ...aggregates, lastStatus: latest?.status ?? null };
  }

  async markStaleRunning(cutoff: Date, error: string) {
    return await db
      .update(Execution)
      .set({
        status: "failed",
        statusCode: 0,
        error,
        completedAt: new Date(),
      })
      .where(
        and(eq(Execution.status, "running"), lt(Execution.startedAt, cutoff)),
      )
      .returning({
        id: Execution.id,
        jobId: Execution.jobId,
        startedAt: Execution.startedAt,
      });
  }
}

export const executionRepo = new ExecutionRespository();
