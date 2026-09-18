/**
 * Reciprocal Rank Fusion (RRF)
 * Combines rankings from multiple distinct retrieval models (e.g. BM25 lexical + Dense vector)
 * into a single unified relevance score:
 * RRF(d) = sum( 1 / (k + rank(d)) )
 */

export interface RankedItem {
  id: string;
}

export interface RrfFusedResult {
  id: string;
  rrfScore: number;
}

export function reciprocalRankFusion(
  rankingLists: RankedItem[][],
  k: number = 60,
): RrfFusedResult[] {
  const scoreMap = new Map<string, number>();

  for (const list of rankingLists) {
    for (let rank = 0; rank < list.length; rank++) {
      const item = list[rank];
      const rankPosition = rank + 1; // 1-indexed
      const increment = 1.0 / (k + rankPosition);

      scoreMap.set(item.id, (scoreMap.get(item.id) ?? 0) + increment);
    }
  }

  const results: RrfFusedResult[] = [];
  for (const [id, rrfScore] of scoreMap.entries()) {
    results.push({ id, rrfScore });
  }

  return results.sort((a, b) => b.rrfScore - a.rrfScore);
}
