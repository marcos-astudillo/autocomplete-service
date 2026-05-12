import { RankingService, PopularityRecord } from '../../src/services/ranking.service';

describe('RankingService', () => {
  let service: RankingService;
  const referenceDate = new Date('2026-05-12');

  beforeEach(() => {
    service = new RankingService();
  });

  describe('calculateScore', () => {
    it('should apply exponential decay based on days old', () => {
      const record: PopularityRecord = {
        query: 'iphone',
        date: '2026-05-11', // 1 day old
        count: 100,
      };
      
      const score = service.calculateScore(record, referenceDate);
      // decay = e^(-0.1 * 1) ≈ 0.9048, normalized: (100 * 0.9048) / 1000 ≈ 0.09
      expect(score).toBeGreaterThan(0.08);
      expect(score).toBeLessThan(0.10);
    });

    it('should return higher score for more recent records with same count', () => {
      const oldRecord: PopularityRecord = { query: 'test', date: '2026-05-01', count: 100 };
      const newRecord: PopularityRecord = { query: 'test', date: '2026-05-11', count: 100 };
      
      const oldScore = service.calculateScore(oldRecord, referenceDate);
      const newScore = service.calculateScore(newRecord, referenceDate);
      
      expect(newScore).toBeGreaterThan(oldScore);
    });

    it('should normalize score to [0, 1] range', () => {
      const highCount: PopularityRecord = { query: 'viral', date: '2026-05-12', count: 50000 };
      const score = service.calculateScore(highCount, referenceDate);
      expect(score).toBeLessThanOrEqual(1);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('rankSuggestions', () => {
    it('should filter by prefix and rank by score', () => {
      const records: PopularityRecord[] = [
        { query: 'iphone 15', date: '2026-05-12', count: 200 },
        { query: 'iphone case', date: '2026-05-12', count: 150 },
        { query: 'samsung galaxy', date: '2026-05-12', count: 300 }, // different prefix
      ];
      
      const results = service.rankSuggestions(records, 'iph', 10);
      
      expect(results).toHaveLength(2);
      expect(results.map(r => r.text)).toContain('iphone 15');
      expect(results.map(r => r.text)).toContain('iphone case');
      expect(results[0].text).toBe('iphone 15'); // higher count → higher score
    });

    it('should aggregate scores for same query across multiple dates', () => {
      const records: PopularityRecord[] = [
        { query: 'iphone', date: '2026-05-12', count: 100 },
        { query: 'iphone', date: '2026-05-11', count: 50 },
      ];
      
      const results = service.rankSuggestions(records, 'iph', 10);
      
      expect(results).toHaveLength(1);
      expect(results[0].text).toBe('iphone');
      // Score should be sum of decayed values, not just latest
      expect(results[0].score).toBeGreaterThan(0.10);
    });

    it('should respect limit parameter', () => {
      const records = Array.from({ length: 20 }, (_, i) => ({
        query: `query${i}`,
        date: '2026-05-12',
        count: 100 - i,
      }));
      
      const results = service.rankSuggestions(records, 'query', 5);
      expect(results).toHaveLength(5);
    });
  });
});
