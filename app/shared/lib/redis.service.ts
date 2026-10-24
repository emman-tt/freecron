import { Redis } from "ioredis";

export function RedisConnection() {
  const redis = new Redis({
    port: Number(process.env.REDIS_PORT),
    maxRetriesPerRequest: null,
  });

  // redis.on("connect", async () =>  console.log("Redis connected succesfully"));
  redis.on("error", async () => console.log("Redis went through an error"));

  return redis;
}
