import { Request, Response, NextFunction } from "express";
import { config } from "../config";

const CDN_CACHEABLE_PREFIXES = new Set([
  "iph",
  "sam",
  "pix",
  "mac",
  "win",
  "and",
]);

export const cacheHeaders = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.path.includes("/suggest") || req.method !== "GET") {
    return next();
  }

  const prefix = (req.query.prefix as string)?.toLowerCase() || "";

  if (CDN_CACHEABLE_PREFIXES.has(prefix)) {
    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
    res.set("CDN-Cache-Control", "max-age=300");
  } else {
    res.set("Cache-Control", "private, no-store, max-age=0");
  }

  res.set(
    "X-Cacheable",
    CDN_CACHEABLE_PREFIXES.has(prefix) ? "edge" : "origin",
  );

  next();
};
