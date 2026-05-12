// src/services/index.service.ts
import { Trie } from "../utils/trie";
import {
  PopularityRepository,
  PopularityRecord,
} from "../repositories/popularity.repository";
import { RankingService } from "./ranking.service";
import { logger } from "../utils/logger";
import { dbPool } from "../config/db";

export class IndexService {
  private activeTrie: Trie;
  private pendingTrie: Trie | null = null;
  private readonly popularityRepo: PopularityRepository;
  private readonly rankingService: RankingService;
  private isRebuilding = false;

  constructor() {
    this.activeTrie = new Trie();
    this.popularityRepo = new PopularityRepository(dbPool);
    this.rankingService = new RankingService();
  }

  search(
    prefix: string,
    limit: number,
  ): Array<{ text: string; score: number }> {
    return this.activeTrie.search(prefix, limit);
  }

  async initialize(lookbackDays: number = 7): Promise<void> {
    logger.info("Initializing suggestion index from historical data...");

    try {
      const records = await this.popularityRepo.getRecentRecords(lookbackDays);
      const entries = this._prepareTrieEntries(records);

      this.activeTrie.bulkInsert(entries);

      const stats = this.activeTrie.getStats();
      logger.info(
        `Index initialized: ${stats.nodeCount} nodes, ${stats.suggestionCount} suggestions`,
      );
    } catch (err) {
      logger.error("Failed to initialize index", { error: err });
      throw err;
    }
  }

  async triggerRebuild(lookbackDays: number = 7): Promise<void> {
    if (this.isRebuilding) {
      logger.warn("Rebuild already in progress, skipping");
      return;
    }

    this.isRebuilding = true;
    logger.info("Starting background index rebuild...");

    try {
      this.pendingTrie = new Trie();

      const records = await this.popularityRepo.getRecentRecords(lookbackDays);
      const entries = this._prepareTrieEntries(records);
      this.pendingTrie.bulkInsert(entries);

      this.activeTrie = this.pendingTrie;
      this.pendingTrie = null;

      const stats = this.activeTrie.getStats();
      logger.info(
        `Index rebuilt successfully: ${stats.nodeCount} nodes, ${stats.suggestionCount} suggestions`,
      );
    } catch (err) {
      logger.error("Index rebuild failed", { error: err });
      this.pendingTrie = null;
    } finally {
      this.isRebuilding = false;
    }
  }

  private _prepareTrieEntries(
    records: PopularityRecord[],
  ): Array<{ prefix: string; suggestion: string; score: number }> {
    const entries: Array<{
      prefix: string;
      suggestion: string;
      score: number;
    }> = [];

    for (const record of records) {
      const score = this.rankingService.calculateScore(record);

      const maxPrefixLen = Math.min(20, record.query.length);
      for (let len = 1; len <= maxPrefixLen; len++) {
        entries.push({
          prefix: record.query.slice(0, len),
          suggestion: record.query,
          score,
        });
      }
    }

    return entries;
  }

  getStats(): { nodes: number; suggestions: number; isRebuilding: boolean } {
    const stats = this.activeTrie.getStats();
    return {
      nodes: stats.nodeCount,
      suggestions: stats.suggestionCount,
      isRebuilding: this.isRebuilding,
    };
  }
}

export const indexService = new IndexService();
