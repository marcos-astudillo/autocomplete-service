import { SuggestQuery, SuggestResponse } from "../models/suggest";
import { logger } from "../utils/logger";
import { dbPool } from "../config/db";
import { PopularityRepository } from "../repositories/popularity.repository";

const popularityRepo = new PopularityRepository(dbPool);

export class SuggestService {
  async getSuggestions(query: SuggestQuery): Promise<SuggestResponse> {
    logger.debug(`Fetching suggestions for prefix: "${query.prefix}"`);

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

    return {
      prefix: query.prefix,
      suggestions: suggestions.slice(0, query.limit),
    };
  }

  async trackSearch(
    query: string,
    date: string = new Date().toISOString().split("T")[0],
  ): Promise<void> {
    await popularityRepo.incrementCount(query, date);
  }
}

export const suggestService = new SuggestService();
