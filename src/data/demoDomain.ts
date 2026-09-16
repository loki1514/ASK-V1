import { processSemanticDraft } from "@/application/processSemanticDraft";
import {
  CanonicalEvent,
  EvidenceSpan,
  SemanticEventDraft,
  TranscriptSegment,
} from "@/domain/model";
import { InMemoryCanonicalEventRepository } from "@/infrastructure/memory/InMemoryCanonicalEventRepository";

const conversationId = "conversation_xyz_tower_2026_09_14";

export { conversationId };

export const demoTranscriptSegments: TranscriptSegment[] = [
  {
    id: "segment_facade",
    conversationId,
    startMs: 12_400,
    endMs: 19_900,
    text: "The client rejected facade option 2 because the facade cost was too high. The structural concept was accepted.",
    anonymousSpeakerId: "speaker_a",
    resolvedSpeakerId: "client",
  },
  {
    id: "segment_drawings",
    conversationId,
    startMs: 23_100,
    endMs: 29_400,
    text: "Rohit will prepare the revised facade drawings and share them by Friday.",
    anonymousSpeakerId: "speaker_b",
    resolvedSpeakerId: "owner",
  },
  {
    id: "segment_pricing",
    conversationId,
    startMs: 31_000,
    endMs: 36_800,
    text: "I will speak with the contractor about pricing before the next client review.",
    anonymousSpeakerId: "speaker_b",
    resolvedSpeakerId: "owner",
  },
  {
    id: "segment_shortage",
    conversationId,
    startMs: 42_000,
    endMs: 48_200,
    text: "The project is delayed by seven days because the required facade material has not arrived.",
    anonymousSpeakerId: "speaker_c",
  },
];

const evidenceFor = (segment: TranscriptSegment): EvidenceSpan => ({
  transcriptSegmentId: segment.id,
  startChar: 0,
  endChar: segment.text.length,
  startMs: segment.startMs,
  endMs: segment.endMs,
  quotedText: segment.text,
});

export const demoDrafts: SemanticEventDraft[] = [
  {
    id: "draft_facade",
    conversationId,
    proposedType: "decision",
    proposedFunction: "CREATE_DECISION",
    fields: {
      title: "Facade proposal",
      objectText:
        "The client rejected facade option 2 because the facade cost was too high. The structural concept was accepted.",
      people: ["Client"],
      project: "XYZ Tower",
      status: "informational",
    },
    parserConfidence: 0.94,
    evidence: [evidenceFor(demoTranscriptSegments[0])],
    parserModelVersion: "fixture-parser/1.0.0",
    warnings: [],
    idempotencyKey: "fixture:facade-decision:v1",
  },
  {
    id: "draft_drawings",
    conversationId,
    proposedType: "action",
    proposedFunction: "CREATE_ACTION",
    fields: {
      title: "Revised drawings",
      objectText: "Rohit will prepare the revised facade drawings and share them by Friday.",
      actor: "Rohit",
      people: ["Rohit"],
      project: "XYZ Tower",
      deadlineAt: "2026-09-18",
      status: "open",
    },
    parserConfidence: 0.96,
    evidence: [evidenceFor(demoTranscriptSegments[1])],
    parserModelVersion: "fixture-parser/1.0.0",
    warnings: [],
    idempotencyKey: "fixture:revised-drawings:v1",
  },
  {
    id: "draft_pricing",
    conversationId,
    proposedType: "commitment",
    proposedFunction: "CREATE_COMMITMENT",
    fields: {
      title: "Pricing discussion",
      objectText: "I will speak with the contractor about pricing before the next client review.",
      actor: "You",
      people: ["You", "Contractor"],
      project: "XYZ Tower",
      status: "open",
    },
    parserConfidence: 0.91,
    evidence: [evidenceFor(demoTranscriptSegments[2])],
    parserModelVersion: "fixture-parser/1.0.0",
    warnings: [],
    idempotencyKey: "fixture:pricing-commitment:v1",
  },
  {
    id: "draft_shortage",
    conversationId,
    proposedType: "issue",
    proposedFunction: "CREATE_ISSUE",
    fields: {
      title: "Material shortage",
      objectText:
        "The project is delayed by seven days because the required facade material has not arrived.",
      people: ["Project team"],
      project: "XYZ Tower",
      status: "open",
    },
    parserConfidence: 0.89,
    evidence: [evidenceFor(demoTranscriptSegments[3])],
    parserModelVersion: "fixture-parser/1.0.0",
    warnings: [],
    idempotencyKey: "fixture:material-shortage:v1",
  },
];

export const demoEventRepository = new InMemoryCanonicalEventRepository();
const transcriptMap = new Map(demoTranscriptSegments.map((segment) => [segment.id, segment]));
const fixedNow = () => new Date("2026-09-14T12:00:00.000Z");

for (const draft of demoDrafts) {
  processSemanticDraft({
    draft,
    transcripts: transcriptMap,
    repository: demoEventRepository,
    now: fixedNow,
  });
}

export const demoCanonicalEvents: CanonicalEvent[] = demoEventRepository.list();

