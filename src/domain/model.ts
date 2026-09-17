export const EVENT_TYPES = [
  "decision",
  "action",
  "commitment",
  "question",
  "requirement",
  "issue",
  "risk",
  "approval",
  "rejection",
  "note",
  "fact",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const FUNCTION_NAMES = [
  "CREATE_DECISION",
  "CREATE_ACTION",
  "CREATE_COMMITMENT",
  "CREATE_QUESTION",
  "CREATE_REQUIREMENT",
  "CREATE_ISSUE",
  "CREATE_RISK",
  "CREATE_APPROVAL",
  "CREATE_REJECTION",
  "CREATE_NOTE",
  "UPSERT_FACT",
  "SUPERSEDE_EVENT",
] as const;

export type FunctionName = (typeof FUNCTION_NAMES)[number];

export type EvidenceSpan = {
  transcriptSegmentId: string;
  startChar: number;
  endChar: number;
  startMs: number;
  endMs: number;
  quotedText: string;
};

export type TranscriptSegment = {
  id: string;
  conversationId: string;
  startMs: number;
  endMs: number;
  text: string;
  speakerName?: string;
  confidence?: number;
  anonymousSpeakerId?: string;
  resolvedSpeakerId?: string;
};

export type Speaker = {
  id: string;
  label: string;
  sourceLabel?: string;
  resolvedName?: string;
  identityStatus: "resolved" | "unresolved";
};

export type ParsedConversation = {
  id: string;
  title: string;
  source: "clean" | "dirty" | "pasted" | "file";
  segments: TranscriptSegment[];
  speakers: Speaker[];
  events: SemanticEventDraft[];
};

export type DraftFields = {
  title: string;
  objectText: string;
  actor?: string;
  people?: string[];
  project?: string;
  deadlineAt?: string;
  status?: CanonicalEventStatus;
  supersedesEventId?: string;
};

export type SemanticEventDraft = {
  id: string;
  conversationId: string;
  proposedType: EventType;
  proposedFunction: FunctionName;
  fields: DraftFields;
  parserConfidence: number;
  evidence: EvidenceSpan[];
  parserModelVersion: string;
  warnings: string[];
  idempotencyKey: string;
};

export type RuleResult = {
  ruleId: string;
  result: "pass" | "fail" | "warn";
  reasonCode: string;
};

export type GuardOutcome = "allow_commit" | "require_review" | "deny";

export type GuardDecision = {
  id: string;
  draftId: string;
  outcome: GuardOutcome;
  ruleResults: RuleResult[];
  normalizedFields: DraftFields;
  requiredConfirmation: "none" | "user_before_commit" | "user_before_external_action";
  policyVersion: string;
  createdAt: string;
};

export type CanonicalEventStatus =
  | "open"
  | "done"
  | "cancelled"
  | "superseded"
  | "informational";

export type CanonicalEvent = {
  id: string;
  conversationId: string;
  type: EventType;
  functionName: FunctionName;
  title: string;
  objectText: string;
  actor?: string;
  people: string[];
  project?: string;
  deadlineAt?: string;
  status: CanonicalEventStatus;
  confidence: {
    parser: number;
    aggregate: number;
  };
  evidence: EvidenceSpan[];
  guardDecisionId: string;
  schemaVersion: 1;
  parserModelVersion: string;
  createdAt: string;
  supersedesEventId?: string;
  idempotencyKey: string;
};

export type MemoryView = {
  id: string;
  eventId: string;
  title: string;
  content: string;
  type: "Decision" | "Action" | "Commitment" | "Question" | "Requirement" | "Issue" | "Risk" | "Approval" | "Rejection" | "Note" | "Fact";
  date: string;
  people: string[];
  project?: string;
  evidence: EvidenceSpan[];
};

export type MemorySearchHit = {
  memory: MemoryView;
  score: number;
};

export type MemoryAnswer = {
  answer: string;
  answerMode: "deterministic";
  confidence: "high" | "medium" | "insufficient";
  hits: MemorySearchHit[];
  conflicts: string[];
};
