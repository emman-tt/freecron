import { Redis } from "ioredis";
import { workerLogger as logger } from "./logger.service.js";

export function RedisConnection() {
  //Log throttle: the error event fires on every failed connect attempt, so a
  //down redis would otherwise spam the stream (outage of 2026-11-03 produced
  //thousands of identical lines per second). One line at the start of an
  //outage, then one per 10s with the suppressed count.
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
    //Reconnect forever with exponential backoff capped at 5s — never null
    //(stopping reconnection would kill the BullMQ worker permanently)
    retryStrategy: (times) => Math.min(times * 200, 5000),
  });

  redis.on("error", logConnectionError);

  return redis;
}
