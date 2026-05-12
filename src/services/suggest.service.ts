import { SuggestQuery, SuggestResponse } from '../models/suggest';
import { logger } from '../utils/logger';

export class SuggestService {
  async getSuggestions(query: SuggestQuery): Promise<SuggestResponse> {
    logger.debug(`Fetching suggestions for prefix: "${query.prefix}"`);
    
    // TODO Phase 3/4: Replace with Redis cache → Trie fallback → DB query
    const mockSuggestions = [
      { text: `${query.prefix}one`, score: 0.98 },
      { text: `${query.prefix}pad`, score: 0.85 },
      { text: `${query.prefix}mini`, score: 0.72 },
    ];

    return {
      prefix: query.prefix,
      suggestions: mockSuggestions.slice(0, query.limit),
    };
  }
}

export const suggestService = new SuggestService();
