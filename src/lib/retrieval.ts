import { MemoryAnswer, MemorySearchHit, MemoryView } from "@/domain/model";
import { memoryRepository, MemoryRepository } from "@/data/memories";

const stopWords = new Set([
  "the", "a", "an", "is", "was", "were", "to", "of", "and", "or", "for", "in", "on",
  "why", "what", "when", "did", "do", "does", "with", "about", "this", "that",
]);

function terms(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((term) => !stopWords.has(term));
}

function searchableText(memory: MemoryView): string {
  return [memory.title, memory.content, memory.project, ...memory.people].filter(Boolean).join(" ");
}

export class LexicalRetrievalEngine {
  constructor(private readonly repository: MemoryRepository) {}

  search(query: string, limit = 4): MemorySearchHit[] {
    const queryTerms = [...new Set(terms(query))];
    if (!queryTerms.length) return [];

    return this.repository
      .list()
      .map((memory) => {
        const documentTerms = new Set(terms(searchableText(memory)));
        const matches = queryTerms.filter((term) => documentTerms.has(term)).length;
        return { memory, score: matches / queryTerms.length };
      })
      .filter((hit) => hit.score > 0)
      .sort((a, b) => b.score - a.score || a.memory.id.localeCompare(b.memory.id))
      .slice(0, limit);
  }

  answer(query: string, limit = 4): MemoryAnswer {
    const hits = this.search(query, limit);
    if (!hits.length) {
      return {
        answer: "I couldn't find enough evidence in local memory to answer that.",
        answerMode: "deterministic",
        confidence: "insufficient",
        hits: [],
        conflicts: [],
      };
    }

    return {
      answer: hits[0].memory.content,
      answerMode: "deterministic",
      confidence: hits[0].score >= 0.5 ? "high" : "medium",
      hits,
      conflicts: [],
    };
  }
}

import { Bm25Engine } from "@/domain/rag/bm25";
import { generateDenseEmbedding, rankDenseDocuments } from "@/domain/rag/denseEmbedding";
import { reciprocalRankFusion } from "@/domain/rag/rrf";
import { maximalMarginalRelevance } from "@/domain/rag/mmr";

/**
 * Hybrid RAG Retrieval Engine (Phase 4)
 * Combines BM25 lexical ranking, dense vector semantics,
 * Reciprocal Rank Fusion (RRF), and Maximal Marginal Relevance (MMR) re-ranking.
 */
export class HybridRagRetrievalEngine {
  private bm25: Bm25Engine;

  constructor(private readonly repository: MemoryRepository) {
    this.bm25 = new Bm25Engine();
  }

  public search(query: string, limit = 4): MemorySearchHit[] {
    const allMemories = this.repository.list();
    if (!allMemories.length || !query.trim()) return [];

    const docs = allMemories.map((m) => ({ id: m.id, text: searchableText(m) }));
    this.bm25.index(docs);

    // 1. BM25 Lexical Ranking
    const bm25Results = this.bm25.score(query, allMemories.length);

    // 2. Dense Semantic Vector Ranking
    const queryEmbedding = generateDenseEmbedding(query);
    const denseDocs = docs.map((d) => ({ id: d.id, text: d.text, embedding: generateDenseEmbedding(d.text) }));
    const denseResults = rankDenseDocuments(queryEmbedding, denseDocs, allMemories.length);

    // 3. Reciprocal Rank Fusion (RRF)
    const fused = reciprocalRankFusion([
      bm25Results.map((r) => ({ id: r.id })),
      denseResults.map((r) => ({ id: r.id })),
    ], 60);

    // 4. Maximal Marginal Relevance (MMR)
    const mmrCandidates = fused.map((f) => {
      const dense = denseResults.find((d) => d.id === f.id);
      const docObj = denseDocs.find((d) => d.id === f.id);
      return {
        id: f.id,
        embedding: docObj ? docObj.embedding! : queryEmbedding,
        querySimilarity: dense ? dense.similarity : 0.5,
      };
    });

    const selected = maximalMarginalRelevance(mmrCandidates, limit, 0.7);

    const hitMap = new Map(allMemories.map((m) => [m.id, m]));
    return selected
      .map((s) => {
        const memory = hitMap.get(s.id);
        if (!memory) return null;
        return { memory, score: s.mmrScore };
      })
      .filter(Boolean) as MemorySearchHit[];
  }

  public answer(query: string, limit = 4): MemoryAnswer {
    const hits = this.search(query, limit);
    if (!hits.length) {
      return {
        answer: "I couldn't find enough evidence in local memory to answer that.",
        answerMode: "deterministic",
        confidence: "insufficient",
        hits: [],
        conflicts: [],
      };
    }

    return {
      answer: hits[0].memory.content,
      answerMode: "deterministic",
      confidence: hits[0].score >= 0.25 ? "high" : "medium",
      hits,
      conflicts: [],
    };
  }
}

export const retrievalEngine = new LexicalRetrievalEngine(memoryRepository);
export const hybridRagEngine = new HybridRagRetrievalEngine(memoryRepository);

export function searchMemories(query: string, limit = 4): MemoryView[] {
  return retrievalEngine.search(query, limit).map((hit) => hit.memory);
}

export function answerFromMemories(query: string): MemoryAnswer {
  return retrievalEngine.answer(query);
}


