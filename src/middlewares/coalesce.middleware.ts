import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

interface CoalescedRequest {
  promise: Promise<any>;
  timestamp: number;
  subscribers: Array<(value: any) => void>;
}

const pendingRequests = new Map<string, CoalescedRequest>();
const COALESCE_TTL_MS = 50;

export const requestCoalescer = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.path.includes("/suggest") || req.method !== "GET") {
    return next();
  }

  const prefix = req.query.prefix as string;
  const locale = req.query.locale as string | undefined;
  const key = locale ? `${prefix}:${locale}` : prefix;

  const existing = pendingRequests.get(key);
  if (existing && Date.now() - existing.timestamp < COALESCE_TTL_MS) {
    logger.debug(`Coalescing request for key: ${key}`);

    existing.promise
      .then((result) => res.status(200).json(result))
      .catch((err) => next(err));

    return;
  }

  let resolve: (value: any) => void;
  const promise = new Promise((res) => {
    resolve = res;
  });

  pendingRequests.set(key, {
    promise,
    timestamp: Date.now(),
    subscribers: [],
  });

  const originalJson = res.json.bind(res);
  res.json = (data) => {
    pendingRequests.delete(key);

    const entry = pendingRequests.get(key);
    if (entry) {
      for (const cb of entry.subscribers) {
        try {
          cb(data);
        } catch (e) {
          logger.warn("Subscriber callback failed", { error: e });
        }
      }
      pendingRequests.delete(key);
    }

    if (resolve) resolve(data);

    return originalJson(data);
  };

  setTimeout(() => {
    if (pendingRequests.has(key)) {
      logger.debug(`Coalesce timeout for key: ${key}`);
      pendingRequests.delete(key);
    }
  }, COALESCE_TTL_MS * 2).unref();

  next();
};
