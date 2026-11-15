import { Redis } from "ioredis";
import { workerLogger as logger } from "./logger.service.js";

export function RedisConnection() {

  let lastLogAt = 0;
  let suppressed = 0;
  const logConnectionError = () => {
    const now = Date.now();
    if (now - lastLogAt < 10_000) {
      suppressed++;
      return;
    }
    logger.error(
      {
        filename: "redis.service.ts",
        functionname: "RedisConnection",
        suppressedSinceLast: suppressed === 0 ? undefined : suppressed,
      },
      suppressed === 0
        ? "redis connection error"
        : `redis connection error (${suppressed} suppressed since last)`,
    );
    lastLogAt = now;
    suppressed = 0;
  };

  const redis = new Redis({
    port: Number(process.env.REDIS_PORT),
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 200, 5000),
  });

  redis.on("error", logConnectionError);

  return redis;
}
