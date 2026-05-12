export interface TrieNode {
  children: Map<string, TrieNode>;
  isEnd: boolean;
  suggestions: Map<string, number>;
}

export class Trie {
  private root: TrieNode;

  constructor() {
    this.root = { children: new Map(), isEnd: false, suggestions: new Map() };
  }

  insert(prefix: string, suggestion: string, score: number): void {
    let node = this.root;
    for (const char of prefix.toLowerCase()) {
      if (!node.children.has(char)) {
        node.children.set(char, { children: new Map(), isEnd: false, suggestions: new Map() });
      }
      node = node.children.get(char)!;
    }
    node.isEnd = true;
    const currentScore = node.suggestions.get(suggestion) ?? 0;
    node.suggestions.set(suggestion, Math.max(score, currentScore));
  }

  search(prefix: string, limit: number = 10): Array<{ text: string; score: number }> {
    let node = this.root;
    
    for (const char of prefix.toLowerCase()) {
      if (!node.children.has(char)) return [];
      node = node.children.get(char)!;
    }
    
    const results: Array<{ text: string; score: number }> = [];
    this._collectSuggestions(node, results);
    
    // ✅ Deduplicar: agrupar por texto, mantener score máximo
    const deduped = new Map<string, number>();
    for (const { text, score } of results) {
      const current = deduped.get(text);
      if (current === undefined || score > current) {
        deduped.set(text, score);
      }
    }
    
    return Array.from(deduped.entries())
      .map(([text, score]) => ({ text, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private _collectSuggestions(
    node: TrieNode, 
    results: Array<{ text: string; score: number }>,
    prefix: string = ''
  ): void {
    for (const [text, score] of node.suggestions) {
      results.push({ text, score });
    }
    for (const [char, child] of node.children) {
      this._collectSuggestions(child, results, prefix + char);
    }
  }

  clear(): void {
    this.root = { children: new Map(), isEnd: false, suggestions: new Map() };
  }

  bulkInsert(entries: Array<{ prefix: string; suggestion: string; score: number }>): void {
    for (const { prefix, suggestion, score } of entries) {
      this.insert(prefix, suggestion, score);
    }
  }

  getStats(): { nodeCount: number; suggestionCount: number } {
    let nodeCount = 0;
    let suggestionCount = 0;
    const traverse = (node: TrieNode) => {
      nodeCount++;
      suggestionCount += node.suggestions.size;
      for (const child of node.children.values()) traverse(child);
    };
    traverse(this.root);
    return { nodeCount, suggestionCount };
  }
}
