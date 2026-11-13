import db from "../../database/db.config.js";
import { Execution } from "../../database/db.schema.js";
import type { Execution as ExecutionType } from "../../shared/types/entities.js";
import { and, count, desc, eq, lt } from "drizzle-orm";
import type { updateDTO } from "./execution.types.js";
//Stale-running sweep constants. A legit execution cannot outlive
//attempts × timeout + backoffs (≈3 min, D-9) — anything "running" older
//than the window is an orphan of a process that died mid-run (sleep,
//force-kill, crash), which BullMQ stall recovery cannot close once the
//queue entry is gone. 15 min leaves a wide margin over the theoretical max
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

  // async getStats() {
  //   //Aggregation and maths calculations in future
  // }

  //Stale-running sweep (D-15): rows whose worker died before the terminal
  //write stay "running" forever — single-process means BullMQ stall recovery
  //has no peer to reclaim through, and the queue entry is gone by next boot.
  //Duration is left null: the run never finished, so its real duration is
  //unknowable — do not fabricate it
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
