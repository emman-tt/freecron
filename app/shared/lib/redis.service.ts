import { Redis } from "ioredis";
import { workerLogger as logger } from "./logger.service.js";

export function RedisConnection() {
  const redis = new Redis({
    port: Number(process.env.REDIS_PORT),
    maxRetriesPerRequest: null,
  });

  redis.on("error", () =>
    logger.error(
      {
        filename: "redis.service.ts",
        functionname: "RedisConnection",
      },
      "redis connection error",
    ),
  );

  return redis;
}
