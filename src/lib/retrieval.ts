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

export const retrievalEngine = new LexicalRetrievalEngine(memoryRepository);

export function searchMemories(query: string, limit = 4): MemoryView[] {
  return retrievalEngine.search(query, limit).map((hit) => hit.memory);
}

export function answerFromMemories(query: string): MemoryAnswer {
  return retrievalEngine.answer(query);
}

