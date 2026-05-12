import { logger } from "../utils/logger";

export interface PopularityRecord {
  query: string;
  date: string;
  count: number;
}

export class RankingService {
  private readonly DECAY_LAMBDA = 0.1;

  calculateScore(
    record: PopularityRecord,
    referenceDate: Date = new Date(),
  ): number {
    const recordDate = new Date(record.date);
    const daysOld =
      (referenceDate.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24);

    const decayFactor = Math.exp(-this.DECAY_LAMBDA * Math.max(0, daysOld));
    const score = record.count * decayFactor;

    return Math.min(1, Math.max(0, score / 1000));
  }

  rankSuggestions(
    records: PopularityRecord[],
    prefix: string,
    limit: number,
  ): Array<{ text: string; score: number }> {
    const scored = records
      .filter((r) => r.query.toLowerCase().startsWith(prefix.toLowerCase()))
      .map((r) => ({
        text: r.query,
        score: this.calculateScore(r),
      }));

    const aggregated = new Map<string, number>();
    for (const { text, score } of scored) {
      aggregated.set(text, (aggregated.get(text) ?? 0) + score);
    }

    return Array.from(aggregated.entries())
      .map(([text, score]) => ({ text, score: Math.min(1, score) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  static createMockRecord(
    query: string,
    daysAgo: number,
    count: number,
  ): PopularityRecord {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return {
      query,
      date: date.toISOString().split("T")[0],
      count,
    };
  }
}

export const rankingService = new RankingService();
