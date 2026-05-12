import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";
import { config } from "../config";
import { logger } from "../utils/logger";

const HOT_PREFIXES = new Set([
  "a",
  "e",
  "i",
  "o",
  "u",
  "el",
  "la",
  "de",
  "en",
  "un",
  "una",
  " ",
]);

const hotLimiter = rateLimit({
  windowMs: 10_000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const prefix = req.query.prefix as string;
    logger.warn("Rate limit exceeded (hot prefix)", { prefix, ip: req.ip });
    res.status(429).json({
      error: { message: "Too many requests for this prefix", retryAfter: 10 },
    });
  },
});

const coldLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn("Rate limit exceeded (cold prefix)", {
      prefix: req.query.prefix,
      ip: req.ip,
    });
    res.status(429).json({
      error: { message: "Too many requests", retryAfter: 60 },
    });
  },
});

export const adaptiveRateLimiter = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const prefix = (req.query.prefix as string)?.toLowerCase() || "";
  const limiter = HOT_PREFIXES.has(prefix) ? hotLimiter : coldLimiter;
  limiter(req, res, next);
};
