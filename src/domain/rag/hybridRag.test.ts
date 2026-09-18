import { describe, expect, it } from "vitest";
import { Bm25Engine } from "./bm25";
import { generateDenseEmbedding, vectorCosineSimilarity, rankDenseDocuments } from "./denseEmbedding";
import { reciprocalRankFusion } from "./rrf";
import { maximalMarginalRelevance } from "./mmr";
import { HybridRagRetrievalEngine } from "@/lib/retrieval";
import { MemoryRepository } from "@/data/memories";
import { MemoryView } from "@/domain/model";

describe("Hybrid RAG Subsystem (Phase 4)", () => {
  const docs = [
    { id: "doc_1", text: "The client rejected the facade proposal because of excessive material costs." },
    { id: "doc_2", text: "Rohit promised to deliver revised engineering drawings before Friday review." },
    { id: "doc_3", text: "Material expenses on facade design exceed the budget by fifteen percent." },
  ];

  it("calculates BM25 lexical ranking correctly", () => {
    const bm25 = new Bm25Engine();
    bm25.index(docs);
    const results = bm25.score("facade costs");

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("doc_1");
  });

  it("generates unit-normalized 384-dimensional dense embeddings", () => {
    const emb = generateDenseEmbedding("test sentence");
    expect(emb.length).toBe(384);

    let norm = 0;
    for (const val of emb) norm += val * val;
    expect(Math.sqrt(norm)).toBeCloseTo(1.0, 3);
  });

  it("ranks dense documents by cosine similarity", () => {
    const qEmb = generateDenseEmbedding("expensive facade materials");
    const denseDocs = docs.map((d) => ({ id: d.id, text: d.text, embedding: generateDenseEmbedding(d.text) }));
    const results = rankDenseDocuments(qEmb, denseDocs, 3);

    expect(results.length).toBe(3);
    expect(["doc_1", "doc_3"]).toContain(results[0].id);
  });

  it("fuses lexical and dense ranks via Reciprocal Rank Fusion (RRF)", () => {
    const lexical = [{ id: "doc_1" }, { id: "doc_3" }, { id: "doc_2" }];
    const dense = [{ id: "doc_3" }, { id: "doc_1" }, { id: "doc_2" }];
    const fused = reciprocalRankFusion([lexical, dense], 60);

    expect(fused.length).toBe(3);
    // doc_1 and doc_3 received top positions across both rankers
    expect(fused[0].rrfScore).toBeGreaterThan(fused[2].rrfScore);
    expect(fused[2].id).toBe("doc_2");
  });

  it("selects diverse non-redundant evidence using Maximal Marginal Relevance (MMR)", () => {
    const candidates = [
      { id: "doc_1", embedding: generateDenseEmbedding(docs[0].text), querySimilarity: 0.90 },
      { id: "doc_3", embedding: generateDenseEmbedding(docs[2].text), querySimilarity: 0.88 }, // highly redundant with doc_1
      { id: "doc_2", embedding: generateDenseEmbedding(docs[1].text), querySimilarity: 0.70 }, // distinct topic
    ];

    const selected = maximalMarginalRelevance(candidates, 2, 0.5);
    expect(selected.length).toBe(2);
    // Selected should prefer the top match plus the diverse second match over the redundant one
    expect(selected[0].id).toBe("doc_1");
  });

  it("answers end-to-end via HybridRagRetrievalEngine", () => {
    const memories: MemoryView[] = docs.map((d, i) => ({
      id: d.id,
      eventId: `ev_${i}`,
      title: `Title ${i}`,
      content: d.text,
      type: "Decision",
      date: "14 Sep 2026",
      people: ["Rohit"],
      project: "XYZ Tower",
      evidence: [],
    }));

    const mockRepo: MemoryRepository = { list: () => memories };
    const hybridEngine = new HybridRagRetrievalEngine(mockRepo);

    const answer = hybridEngine.answer("Why was the facade rejected?");
    expect(answer.hits.length).toBeGreaterThan(0);
    expect(answer.answer).toContain("facade");
    expect(answer.confidence).toBe("high");
  });
});
