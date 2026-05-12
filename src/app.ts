import "dotenv/config";
import express from "express";
import { config } from "./config";
import { logger } from "./utils/logger";
import { errorHandler } from "./middlewares/error.middleware";
import suggestRoutes from "./routes/suggest.routes";
import { initDb } from "./config/db";
import { indexService } from "./services/index.service";
import { requestCoalescer } from "./middlewares/coalesce.middleware";
import { adaptiveRateLimiter } from "./middlewares/rateLimit.middleware";
import { cacheHeaders } from "./middlewares/cacheHeaders.middleware";
import metricsRouter from "./routes/metrics.routes";
import docsRouter from './routes/docs.routes';

const app = express();

app.set("trust proxy", 1);
app.use(express.json());

app.use(requestCoalescer);
app.use(adaptiveRateLimiter);
app.use(cacheHeaders);

app.use("/metrics", metricsRouter);
app.use(docsRouter);
app.use(config.API_PREFIX, suggestRoutes);

app.get("/health", (_, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((req, res, next) => {
  logger.debug(`404 catch-all hit: ${req.method} ${req.url}`);
  res.status(404).json({ error: { message: "Route not found" } });
});

app.use(errorHandler);

initDb()
  .then(async () => {
    indexService.initialize(7).catch((err) => {
      logger.error("Failed to initialize suggestion index", { error: err });
    });

    app.listen(config.PORT, () => {
      logger.info(
        `Autocomplete service listening on port ${config.PORT} [${config.NODE_ENV}]`,
      );
    });
  })
  .catch((err) => {
    logger.error("Failed to connect to database, shutting down", {
      error: err,
    });
    process.exit(1);
  });

export default app;
