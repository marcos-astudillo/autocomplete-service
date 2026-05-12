import rateLimit from "express-rate-limit";
import { config } from "../config";

export const rateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res
      .status(429)
      .json({
        error: { message: "Too many requests, please try again later." },
      });
  },
});
