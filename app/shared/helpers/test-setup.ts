import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { Redis } from "ioredis";
import path from "node:path";
import postgres from "postgres";
import { Job, User } from "../../database/db.schema.js";
import { closeDb } from "../../database/db.config.js";
import { NotFoundError } from "../errors/business.errors.js";
import type { createJobDTO } from "../../modules/Jobs/job.types.js";
import type { Job as JobType } from "../types/entities.js";
import { JOB_DEFUALTS } from "../../modules/Jobs/job.defaults.js";

const TRUNCATE = sql`TRUNCATE "users", "job", "execution", "notification", "session", "account", "verification" RESTART IDENTITY CASCADE`;

export let db: ReturnType<typeof drizzle>;
export let redis: Redis;
let client: ReturnType<typeof postgres>;
export async function SetupTestInfra() {
  const connectionString = process.env.DATABASE_URL;

  client = postgres(connectionString);
  db = drizzle({ client });

  // await migrate(db, {
  //   migrationsFolder: path.resolve(process.cwd(), "drizzle"),
  // });

  redis = new Redis({
    port: Number(process.env.REDIS_PORT),
    maxRetriesPerRequest: null,
  });
}
export async function CleanTestInfra() {
  await db.execute(TRUNCATE);
  await redis.flushdb();
}
export async function TeardownTestInfra() {
  await redis.quit();
  await client.end();
  await closeDb();
}

export async function createUserTest(name: string) {
  const random = crypto.randomUUID().split("-")[0];
  const [user] = await db
    .insert(User)
    .values({
      name: name,
      email: `emman${random}@gmail.com`,
    })
    .returning();

  if (!user) {
    throw new NotFoundError();
  }

  return user;
}

export async function createJobTest(userId: string, data: JobType) {
  const [created] = await db
    .insert(Job)
    .values({
      ...data,
      description: data.description ?? JOB_DEFUALTS.description,
      httpBody: data.httpBody ?? JOB_DEFUALTS.httpBody,
      httpMethod: data.httpMethod ?? JOB_DEFUALTS.httpMethod,
      httpHeader: data.httpHeader ?? JOB_DEFUALTS.httpHeader,
      nextRunAt: data.nextRunAt,
      lastRunAt: data.lastRunAt,
      maxRetries: JOB_DEFUALTS.maxRetries,
      retryDelay: JOB_DEFUALTS.retryDelay,
      timeout: data.timeout ?? JOB_DEFUALTS.timeout,
      isActive: JOB_DEFUALTS.isActive,
    })
    .returning();
  return created;
}
