import { Pool } from "pg";
import { dbPool } from "../config/db";
import { logger } from "../utils/logger";

export interface PopularityRecord {
  query: string;
  date: string;
  count: number;
}

export class PopularityRepository {
  constructor(private pool: Pool) {}

  async incrementCount(query: string, date?: string): Promise<void> {
    const effectiveDate = date ?? new Date().toISOString().split("T")[0];

    const q = `
    INSERT INTO query_counts_daily (query, date, count)
    VALUES ($1, $2, 1)
    ON CONFLICT (query, date) 
    DO UPDATE SET count = query_counts_daily.count + 1
  `;
    try {
      await this.pool.query(q, [query.toLowerCase(), effectiveDate]);
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

  async getRecentRecords(days: number): Promise<PopularityRecord[]> {
    const q = `
    SELECT query, date, count
    FROM query_counts_daily
    WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
    ORDER BY count DESC
    LIMIT 10000
  `;
    const { rows } = await this.pool.query(q);
    return rows.map((r) => ({
      query: r.query,
      date: r.date.toISOString().split("T")[0],
      count: Number(r.count),
    }));
  }

  async getTopByPrefixWithHistory(
    prefix: string,
    limit: number,
  ): Promise<PopularityRecord[]> {
    const q = `
    SELECT query, date, count
    FROM query_counts_daily
    WHERE query ILIKE $1 
      AND date >= CURRENT_DATE - INTERVAL '7 days'
    ORDER BY count DESC
    LIMIT $2
  `;
    const { rows } = await this.pool.query(q, [`${prefix}%`, limit]);
    return rows.map((r) => ({
      query: r.query,
      date: r.date.toISOString().split("T")[0],
      count: Number(r.count),
    }));
  }
} export const popularityRepo = new PopularityRepository(dbPool);
