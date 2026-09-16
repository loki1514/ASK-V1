import { describe, expect, it } from "vitest";
import { MemoryRepository } from "@/data/memories";
import { MemoryView } from "@/domain/model";
import { LexicalRetrievalEngine } from "@/lib/retrieval";

const memories: MemoryView[] = [
  {
    id: "memory_1",
    eventId: "event_1",
    title: "Facade rejected",
    content: "The client rejected facade option 2 because its cost was too high.",
    type: "Decision",
    date: "14 Sep 2026",
    people: ["Client"],
    project: "XYZ Tower",
    evidence: [{
      transcriptSegmentId: "segment_1",
      startChar: 0,
      endChar: 67,
      startMs: 10_000,
      endMs: 14_000,
      quotedText: "The client rejected facade option 2 because its cost was too high.",
    }],
  },
  {
    id: "memory_2",
    eventId: "event_2",
    title: "Drawings action",
    content: "Rohit will prepare revised drawings by Friday.",
    type: "Action",
    date: "14 Sep 2026",
    people: ["Rohit"],
    project: "XYZ Tower",
    evidence: [],
  },
];

const repository: MemoryRepository = { list: () => memories };
const engine = new LexicalRetrievalEngine(repository);

describe("LexicalRetrievalEngine", () => {
  it("answers from the highest-ranked memory without query-specific branches", () => {
    const result = engine.answer("Why did the client reject the facade option?");

    expect(result.answer).toContain("cost was too high");
    expect(result.hits[0].memory.eventId).toBe("event_1");
    expect(result.hits[0].memory.evidence[0].transcriptSegmentId).toBe("segment_1");
  });

  it("returns an explicit insufficient-evidence response", () => {
    const result = engine.answer("What was the catering menu?");

    expect(result.confidence).toBe("insufficient");
    expect(result.hits).toEqual([]);
  });
});

