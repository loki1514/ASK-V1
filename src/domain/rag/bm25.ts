/**
 * Okapi BM25 Lexical Ranking Engine
 * Provides term frequency - inverse document frequency scoring over text documents.
 */

export interface Bm25Document {
  id: string;
  text: string;
}

export interface Bm25ScoredResult {
  id: string;
  score: number;
}

export class Bm25Engine {
  private k1: number;
  private b: number;
  private docLengths: Map<string, number>;
  private avgDocLength: number;
  private docTermFreqs: Map<string, Map<string, number>>;
  private termDocFreqs: Map<string, number>;
  private totalDocs: number;

  constructor(k1 = 1.2, b = 0.75) {
    this.k1 = k1;
    this.b = b;
    this.docLengths = new Map();
    this.avgDocLength = 0;
    this.docTermFreqs = new Map();
    this.termDocFreqs = new Map();
    this.totalDocs = 0;
  }

  public tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1);
  }

  public index(docs: Bm25Document[]): void {
    this.totalDocs = docs.length;
    this.docLengths.clear();
    this.docTermFreqs.clear();
    this.termDocFreqs.clear();

    let totalLength = 0;

    for (const doc of docs) {
      const tokens = this.tokenize(doc.text);
      this.docLengths.set(doc.id, tokens.length);
      totalLength += tokens.length;

      const tf = new Map<string, number>();
      const seenTerms = new Set<string>();

      for (const token of tokens) {
        tf.set(token, (tf.get(token) ?? 0) + 1);
        seenTerms.add(token);
      }

      this.docTermFreqs.set(doc.id, tf);

      for (const term of seenTerms) {
        this.termDocFreqs.set(term, (this.termDocFreqs.get(term) ?? 0) + 1);
      }
    }

    this.avgDocLength = this.totalDocs > 0 ? totalLength / this.totalDocs : 0;
  }

  public score(query: string, limit: number = 10): Bm25ScoredResult[] {
    const queryTokens = this.tokenize(query);
    if (queryTokens.length === 0 || this.totalDocs === 0) return [];

    const results: Bm25ScoredResult[] = [];

    for (const [docId, tfMap] of this.docTermFreqs.entries()) {
      let score = 0;
      const docLen = this.docLengths.get(docId) ?? 0;

      for (const token of queryTokens) {
        const tf = tfMap.get(token) ?? 0;
        if (tf === 0) continue;

        const df = this.termDocFreqs.get(token) ?? 0;
        // Standard Robertson-Sparck Jones IDF
        const idf = Math.log(1 + (this.totalDocs - df + 0.5) / (df + 0.5));
        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / Math.max(1, this.avgDocLength)));

        score += idf * (numerator / denominator);
      }

      if (score > 0) {
        results.push({ id: docId, score });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
