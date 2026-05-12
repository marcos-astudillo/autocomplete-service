// src/services/suggest.service.ts (versión Phase 5)
import { SuggestQuery, SuggestResponse } from "../models/suggest";
import { logger } from "../utils/logger";
import { cacheService } from "./cache.service";
import { indexService } from "./index.service";
import { popularityRepo } from "../repositories/popularity.repository";
import { rankingService } from "./ranking.service";

const HOT_PREFIXES = [
  "a",
  "e",
  "i",
  "o",
  "u",
  "el",
  "la",
  "de",
  "en",
  "un",
  "una",
];

export class SuggestService {
  private isHotPrefix(prefix: string): boolean {
    return HOT_PREFIXES.includes(prefix.toLowerCase());
  }

  async getSuggestions(query: SuggestQuery): Promise<SuggestResponse> {
    logger.debug(`Fetching suggestions for prefix: "${query.prefix}"`);

    const cached = await cacheService.get(query.prefix, query.locale);
    if (cached) {
      return cached;
    }

    const trieResults = indexService.search(query.prefix, query.limit * 2);

    const suggestions =
      trieResults.length > 0
        ? trieResults.slice(0, query.limit)
        : await this._fallbackToDb(query.prefix, query.limit);

    const result: SuggestResponse = {
      prefix: query.prefix,
      suggestions: suggestions.slice(0, query.limit),
    };

    cacheService
      .set(query.prefix, result, query.locale, this.isHotPrefix(query.prefix))
      .catch((err) => logger.warn("Async cache write failed", { error: err }));

    this._trackQueryAsync(query.prefix);

    return result;
  }

  private async _fallbackToDb(
    prefix: string,
    limit: number,
  ): Promise<Array<{ text: string; score: number }>> {
    try {
      const records = await popularityRepo.getTopByPrefixWithHistory(
        prefix,
        limit * 2,
      );
      return rankingService.rankSuggestions(records, prefix, limit);
    } catch (err) {
      logger.warn("DB fallback failed, returning empty suggestions", {
        error: err,
      });
      return [];
    }
  }

  private async _trackQueryAsync(query: string): Promise<void> {
    popularityRepo
      .incrementCount(query.toLowerCase())
      .catch((err) =>
        logger.debug("Async query tracking failed (non-critical)", {
          error: err,
        }),
      );
  }
}

export const suggestService = new SuggestService();
