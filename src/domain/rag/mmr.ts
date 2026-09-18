import { vectorCosineSimilarity } from "./denseEmbedding";

export interface MmrCandidate {
  id: string;
  embedding: number[];
  querySimilarity: number; // Sim1(Candidate, Query)
}

export interface MmrSelectionResult {
  id: string;
  mmrScore: number;
}

/**
 * Maximal Marginal Relevance (MMR) Re-ranker
 * Selects an optimal subset of documents balancing query relevance and inter-document diversity:
 * MMR = argmax [ lambda * Sim1(di, Q) - (1 - lambda) * max_dj Sim2(di, dj) ]
 */
export function maximalMarginalRelevance(
  candidates: MmrCandidate[],
  topK: number = 5,
  lambda: number = 0.7,
): MmrSelectionResult[] {
  if (candidates.length === 0 || topK <= 0) return [];

  const selected: MmrCandidate[] = [];
  const results: MmrSelectionResult[] = [];
  const remaining = [...candidates];

  while (selected.length < topK && remaining.length > 0) {
    let bestIdx = -1;
    let bestMmrScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      const sim1 = cand.querySimilarity;

      // Find maximum similarity to already selected documents
      let maxSim2 = 0;
      for (const sel of selected) {
        const sim2 = vectorCosineSimilarity(cand.embedding, sel.embedding);
        if (sim2 > maxSim2) {
          maxSim2 = sim2;
        }
      }

      // Calculate MMR objective
      const mmrScore = lambda * sim1 - (1 - lambda) * maxSim2;

      if (mmrScore > bestMmrScore) {
        bestMmrScore = mmrScore;
        bestIdx = i;
      }
    }

    if (bestIdx !== -1) {
      const chosen = remaining.splice(bestIdx, 1)[0];
      selected.push(chosen);
      results.push({ id: chosen.id, mmrScore: bestMmrScore });
    } else {
      break;
    }
  }

  return results;
}
