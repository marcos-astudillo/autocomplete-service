import { Pool } from "pg";
import { config } from "./index";
import { logger } from "../utils/logger";

export const dbPool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

dbPool.on("error", (err) => {
  logger.error("Unexpected database pool error", { error: err.message });
});

export const initDb = async () => {
  const client = await dbPool.connect();
  try {
    await client.query("SELECT NOW()");
    logger.info("Database connection established");
  } finally {
    client.release();
  }
};
