import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().min(1000).max(65535).default(3000),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  API_PREFIX: z.string().default("/v1"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  CACHE_TTL_SECONDS: z.coerce.number().min(1).default(300),
  CACHE_JITTER_MS: z.coerce.number().min(0).default(5000),
  CACHE_HOT_PREFIX_TTL: z.coerce.number().min(1).default(60),
});

export const config = envSchema.parse(process.env);
