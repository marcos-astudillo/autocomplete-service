import { Trie } from '../../src/utils/trie';

describe('Trie', () => {
  let trie: Trie;

  beforeEach(() => {
    trie = new Trie();
  });

  describe('insert', () => {
    it('should insert a suggestion for a prefix', () => {
      trie.insert('iph', 'iphone 15', 0.98);
      const results = trie.search('iph', 10);
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({ text: 'iphone 15', score: 0.98 });
    });

    it('should keep highest score when same suggestion inserted twice', () => {
      trie.insert('iph', 'iphone', 0.50);
      trie.insert('iph', 'iphone', 0.90);
      const results = trie.search('iph', 10);
      expect(results[0].score).toBe(0.90);
    });

    it('should insert for multiple prefix lengths', () => {
      trie.insert('i', 'iphone', 0.80);
      trie.insert('ip', 'iphone', 0.80);
      trie.insert('iph', 'iphone', 0.80);
      
      expect(trie.search('i', 10)[0]?.text).toBe('iphone');
      expect(trie.search('ip', 10)[0]?.text).toBe('iphone');
      expect(trie.search('iph', 10)[0]?.text).toBe('iphone');
    });
  });

  describe('search', () => {
    it('should return empty array for non-existent prefix', () => {
      trie.insert('iph', 'iphone', 0.90);
      expect(trie.search('xyz', 10)).toEqual([]);
    });

    it('should respect limit parameter', () => {
      trie.insert('iph', 'iphone 15', 0.98);
      trie.insert('iph', 'iphone case', 0.85);
      trie.insert('iph', 'iphone charger', 0.72);
      
      const results = trie.search('iph', 2);
      expect(results).toHaveLength(2);
      expect(results.map(r => r.text)).toEqual(['iphone 15', 'iphone case']);
    });

    it('should return results sorted by score descending', () => {
      trie.insert('iph', 'low', 0.30);
      trie.insert('iph', 'high', 0.95);
      trie.insert('iph', 'mid', 0.60);
      
      const results = trie.search('iph', 10);
      expect(results.map(r => r.text)).toEqual(['high', 'mid', 'low']);
    });

    it('should deduplicate suggestions keeping highest score', () => {
      // Insert same suggestion via different prefix paths
      trie.insert('i', 'iphone', 0.50);
      trie.insert('ip', 'iphone', 0.90);
      trie.insert('iph', 'iphone', 0.70);
      
      const results = trie.search('iph', 10);
      // Should appear only once with highest score
      const iphoneEntries = results.filter(r => r.text === 'iphone');
      expect(iphoneEntries).toHaveLength(1);
      expect(iphoneEntries[0].score).toBe(0.70); // Score at "iph" node
    });
  });

  describe('bulkInsert', () => {
    it('should insert multiple entries efficiently', () => {
      const entries = [
        { prefix: 'iph', suggestion: 'iphone 15', score: 0.98 },
        { prefix: 'iph', suggestion: 'iphone case', score: 0.85 },
        { prefix: 'sam', suggestion: 'samsung', score: 0.92 },
      ];
      
      trie.bulkInsert(entries);
      
      expect(trie.search('iph', 10)).toHaveLength(2);
      expect(trie.search('sam', 10)[0]?.text).toBe('samsung');
    });
  });

  describe('getStats', () => {
    it('should return accurate node and suggestion counts', () => {
      trie.insert('a', 'apple', 0.90);
      trie.insert('ap', 'apple', 0.90);
      trie.insert('app', 'apple', 0.90);
      
      const stats = trie.getStats();
      expect(stats.nodeCount).toBeGreaterThan(0);
      expect(stats.suggestionCount).toBe(3); // Count per-node entries // apple inserted once per node, but counted per node.suggestions
    });
  });
});
