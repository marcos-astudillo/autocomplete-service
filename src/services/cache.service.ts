import Redis, { RedisOptions } from "ioredis";
import { config } from "../config";
import { logger } from "../utils/logger";
import { SuggestResponse } from "../models/suggest";

export class CacheService {
  private client: Redis;
  private readonly keyPrefix = "autocomplete:suggest";

  private hitCount = 0;
  private missCount = 0;
  private readonly METRICS_FLUSH_INTERVAL = 100;

  constructor() {
    const redisOptions: RedisOptions = {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      lazyConnect: true,
    };

    this.client = new Redis(config.REDIS_URL, redisOptions);

    this.client.on("error", (err) => {
      logger.warn("Redis connection error", { error: err.message });
    });

    this.client.on("connect", () => {
      logger.info("Redis client connected");
    });
  }

  private buildKey(prefix: string, locale?: string): string {
    return locale
      ? `${this.keyPrefix}:${prefix}:${locale}`
      : `${this.keyPrefix}:${prefix}`;
  }

  private calculateTtl(isHotPrefix: boolean): number {
    const baseTtl = isHotPrefix
      ? config.CACHE_HOT_PREFIX_TTL
      : config.CACHE_TTL_SECONDS;
    const jitter = Math.floor(Math.random() * config.CACHE_JITTER_MS);
    return baseTtl * 1000 + jitter;
  }

  private logMetrics(): void {
    const total = this.hitCount + this.missCount;
    if (
      total > 0 &&
      total % this.METRICS_FLUSH_INTERVAL === 0 &&
      config.NODE_ENV === "development"
    ) {
      const hitRate = ((this.hitCount / total) * 100).toFixed(1);
      logger.info(
        `📊 Cache metrics: hitRate=${hitRate}% | hits=${this.hitCount} | misses=${this.missCount}`,
      );
    }
  }

  async get(prefix: string, locale?: string): Promise<SuggestResponse | null> {
    try {
      const key = this.buildKey(prefix, locale);
      const cached = await this.client.get(key);

      if (cached) {
        this.hitCount++;
        this.logMetrics();
        logger.debug(`Cache HIT for key: ${key}`);
        return JSON.parse(cached) as SuggestResponse;
      }

      this.missCount++;
      this.logMetrics();
      logger.debug(`Cache MISS for key: ${key}`);
      return null;
    } catch (err) {
      logger.warn("Redis GET failed, falling back to DB", { error: err });
      return null;
    }
  }

  async set(
    prefix: string,
    data: SuggestResponse,
    locale?: string,
    isHotPrefix?: boolean,
  ): Promise<void> {
    try {
      const key = this.buildKey(prefix, locale);
      const ttlSeconds = Math.floor(this.calculateTtl(!!isHotPrefix) / 1000);

      await this.client.setex(key, ttlSeconds, JSON.stringify(data));
      logger.debug(`Cache SET for key: ${key} with TTL: ${ttlSeconds}s`);
    } catch (err) {
      logger.warn("Redis SET failed, continuing without cache", { error: err });
    }
  }

  async disconnect(): Promise<void> {
    const total = this.hitCount + this.missCount;
    if (total > 0) {
      const hitRate = ((this.hitCount / total) * 100).toFixed(1);
      logger.info(
        `📊 Final cache metrics: hitRate=${hitRate}% | hits=${this.hitCount} | misses=${this.missCount}`,
      );
    }
    await this.client.quit();
    logger.info("Redis client disconnected");
  }
}

export const cacheService = new CacheService();
