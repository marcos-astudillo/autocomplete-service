import { SuggestQuery, SuggestResponse } from "../models/suggest";
import { logger } from "../utils/logger";
import { dbPool } from "../config/db";
import { PopularityRepository } from "../repositories/popularity.repository";
import { cacheService } from "./cache.service";

const popularityRepo = new PopularityRepository(dbPool);

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

    const dbSuggestions = await popularityRepo.getTopByPrefix(
      query.prefix,
      query.limit,
    );

    const suggestions =
      dbSuggestions.length > 0
        ? dbSuggestions
        : [
            { text: `${query.prefix}one`, score: 0.98 },
            { text: `${query.prefix}pad`, score: 0.85 },
            { text: `${query.prefix}mini`, score: 0.72 },
          ];

    const result: SuggestResponse = {
      prefix: query.prefix,
      suggestions: suggestions.slice(0, query.limit),
    };

    cacheService
      .set(query.prefix, result, query.locale, this.isHotPrefix(query.prefix))
      .catch((err) => logger.warn("Async cache write failed", { error: err }));

    return result;
  }

  async trackSearch(
    query: string,
    date: string = new Date().toISOString().split("T")[0],
  ): Promise<void> {
    await popularityRepo.incrementCount(query, date);
  }
}

export const suggestService = new SuggestService();
