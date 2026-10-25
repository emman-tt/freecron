import { Redis } from "ioredis";
export class SharedCacheRepository {
  private redis: Redis;
  constructor(redis: Redis) {
    this.redis = redis;
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (value === null) {
      return null;
    }
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async set<T>(key: string, value: T, ttl: number = 300): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), "EX", ttl);
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
