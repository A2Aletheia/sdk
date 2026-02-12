import type { Task } from "@a2a-js/sdk";
import type { TaskStore } from "@a2a-js/sdk/server";

/**
 * Minimal subset of a Redis client that {@link RedisTaskStore} needs.
 * Compatible with ioredis, node-redis v4, and most Redis client libraries.
 */
export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: unknown[]): Promise<unknown>;
  del(...args: unknown[]): Promise<unknown>;
}

export interface RedisTaskStoreOptions {
  /** Key prefix. Default: `"aletheia:task:"` */
  prefix?: string;
  /** TTL in seconds. Default: `86400` (24 hours). Set to `0` to disable. */
  ttlSeconds?: number;
}

const DEFAULT_PREFIX = "aletheia:task:";
const DEFAULT_TTL = 86400; // 24 hours

/**
 * A {@link TaskStore} backed by any Redis-like client.
 *
 * @example
 * ```ts
 * import IORedis from "ioredis";
 * import { RedisTaskStore } from "@a2aletheia/sdk/agent";
 *
 * const redis = new IORedis("redis://localhost:6379");
 * const taskStore = new RedisTaskStore(redis, { ttlSeconds: 3600 });
 *
 * const agent = new AletheiaAgent({ taskStore, ... });
 * ```
 */
export class RedisTaskStore implements TaskStore {
  private readonly redis: RedisLike;
  private readonly prefix: string;
  private readonly ttl: number;

  constructor(redis: RedisLike, options?: RedisTaskStoreOptions) {
    this.redis = redis;
    this.prefix = options?.prefix ?? DEFAULT_PREFIX;
    this.ttl = options?.ttlSeconds ?? DEFAULT_TTL;
  }

  async save(task: Task): Promise<void> {
    const key = `${this.prefix}${task.id}`;
    const value = JSON.stringify(task);
    if (this.ttl > 0) {
      await this.redis.set(key, value, "EX", this.ttl);
    } else {
      await this.redis.set(key, value);
    }
  }

  async load(taskId: string): Promise<Task | undefined> {
    const raw = await this.redis.get(`${this.prefix}${taskId}`);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as Task;
    } catch {
      return undefined;
    }
  }
}
