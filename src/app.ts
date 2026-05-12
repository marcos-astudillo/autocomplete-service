import express from "express";
import { config } from "./config";
import { logger } from "./utils/logger";
import { errorHandler } from "./middlewares/error.middleware";
import { rateLimiter } from "./middlewares/rateLimit.middleware";
import suggestRoutes from "./routes/suggest.routes";

const app = express();

app.set("trust proxy", 1); // Necesario para rate limiting correcto detrás de proxies/CDN
app.use(express.json());
app.use(rateLimiter);

app.use(config.API_PREFIX, suggestRoutes);

app.get("/health", (_, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  res.status(404).json({ error: { message: "Route not found" } });
});

app.use(errorHandler);

app.listen(config.PORT, () => {
  logger.info(
    `Autocomplete service listening on port ${config.PORT} [${config.NODE_ENV}]`,
  );
});

export default app;
