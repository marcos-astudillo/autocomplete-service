import { Router } from "express";

const router = Router();

let totalRequests = 0;
let cacheHits = 0;
let cacheMisses = 0;
let errors = 0;

export const metrics = {
  incrementRequest: () => {
    totalRequests++;
  },
  incrementCacheHit: () => {
    cacheHits++;
  },
  incrementCacheMiss: () => {
    cacheMisses++;
  },
  incrementError: () => {
    errors++;
  },
  getSnapshot: () => ({
    totalRequests,
    cacheHits,
    cacheMisses,
    errors,
    hitRate:
      totalRequests > 0
        ? ((cacheHits / totalRequests) * 100).toFixed(2)
        : "0.00",
  }),
};

router.get("/", (_req, res) => {
  const snapshot = metrics.getSnapshot();

  const output = `
# HELP autocomplete_requests_total Total requests received
# TYPE autocomplete_requests_total counter
autocomplete_requests_total ${snapshot.totalRequests}

# HELP autocomplete_cache_hits_total Cache hits
# TYPE autocomplete_cache_hits_total counter
autocomplete_cache_hits_total ${snapshot.cacheHits}

# HELP autocomplete_cache_misses_total Cache misses
# TYPE autocomplete_cache_misses_total counter
autocomplete_cache_misses_total ${snapshot.cacheMisses}

# HELP autocomplete_cache_hit_rate Cache hit rate percentage
# TYPE autocomplete_cache_hit_rate gauge
autocomplete_cache_hit_rate ${snapshot.hitRate}

# HELP autocomplete_errors_total Total errors
# TYPE autocomplete_errors_total counter
autocomplete_errors_total ${snapshot.errors}
`.trim();

  res.set("Content-Type", "text/plain; version=0.0.4");
  res.status(200).send(output);
});

export default router;
