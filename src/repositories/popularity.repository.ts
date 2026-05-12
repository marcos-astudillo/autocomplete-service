import { Pool } from "pg";
import { logger } from "../utils/logger";

export interface PopularityRecord {
  query: string;
  date: string;
  count: number;
}

export class PopularityRepository {
  constructor(private pool: Pool) {}

  async incrementCount(query: string, date: string): Promise<void> {
    const q = `
      INSERT INTO query_counts_daily (query, date, count)
      VALUES ($1, $2, 1)
      ON CONFLICT (query, date) 
      DO UPDATE SET count = query_counts_daily.count + 1
    `;
    try {
      await this.pool.query(q, [query.toLowerCase(), date]);
    } catch (err) {
      logger.error("Failed to increment query count", { query, error: err });
      throw err;
    }
  }

  async getTopByPrefix(
    prefix: string,
    limit: number,
  ): Promise<{ text: string; score: number }[]> {
    const q = `
      SELECT query AS text, count AS score
      FROM query_counts_daily
      WHERE query ILIKE $1
      ORDER BY count DESC
      LIMIT $2
    `;
    const { rows } = await this.pool.query(q, [`${prefix}%`, limit]);
    return rows.map((r) => ({ text: r.text, score: Number(r.score) }));
  }
}
