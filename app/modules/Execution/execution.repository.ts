import db from "../../database/db.config.js";
import { Execution } from "../../database/db.schema.js";
import type { Execution as ExecutionType } from "../../shared/types/entities.js";
import { count, desc, eq } from "drizzle-orm";
import type { updateDTO } from "./execution.types.js";
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
}

export const executionRepo = new ExecutionRespository();
