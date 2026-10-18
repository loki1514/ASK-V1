import { SemanticEventDraft, TranscriptSegment, EventType, FunctionName } from "@/domain/model";
import { SemanticParser } from "@/application/parsing/contracts";

type Rule = {
  match: RegExp;
  type: EventType;
  fn: FunctionName;
  title: string;
  objectText: string;
  actor?: string;
  deadlineAt?: string;
  confidence: number;
};

const rules: Rule[] = [
  {
    match: /panels?.*(not arrived|not on site|hasn't delivered)/i,
    type: "issue",
    fn: "CREATE_ISSUE",
    title: "Electrical panels delayed",
    objectText: "Electrical panels have not arrived on site, blocking installation readiness.",
    confidence: 0.94,
  },
  {
    match: /need.*panel.*delivery confirmed/i,
    type: "requirement",
    fn: "CREATE_REQUIREMENT",
    title: "Confirm panel delivery",
    objectText: "Electrical-panel delivery must be confirmed before installation can begin.",
    confidence: 0.97,
  },
  {
    match: /i'll check.*PO status.*5\s*pm/i,
    type: "action",
    fn: "CREATE_ACTION",
    title: "Check PO status",
    objectText: "Speaker 3 will check the PO status with procurement and confirm by 5 PM today.",
    actor: "Speaker 3",
    deadlineAt: "2026-09-18T17:00:00Z",
    confidence: 0.96,
  },
  {
    match: /proceed with HVAC completion.*Friday/i,
    type: "decision",
    fn: "CREATE_DECISION",
    title: "HVAC completion Friday",
    objectText: "Proceed with HVAC completion on Friday, followed by ceiling work on Saturday.",
    confidence: 0.98,
  },
  {
    match: /i'll send.*revised drawing.*Wednesday noon/i,
    type: "commitment",
    fn: "CREATE_COMMITMENT",
    title: "Send revised drawing",
    objectText: "Speaker 2 committed to sending the revised drawing to the client by Wednesday noon.",
    actor: "Speaker 2",
    deadlineAt: "2026-09-23T12:00:00Z",
    confidence: 0.97,
  },
  {
    match: /ceiling work depends on.*HVAC handover/i,
    type: "risk",
    fn: "CREATE_RISK",
    title: "Ceiling depends on HVAC",
    objectText: "Ceiling work may slip if the HVAC handover is not completed first.",
    confidence: 0.92,
  },
  {
    match: /does the client want 100 or 120|client want 100 or 120/i,
    type: "question",
    fn: "CREATE_QUESTION",
    title: "Confirm workstation count",
    objectText: "Does the client want 100 or 120 workstations?",
    confidence: 0.99,
  },
  {
    match: /i'll ask the client.*confirm.*workstation count.*tomorrow/i,
    type: "action",
    fn: "CREATE_ACTION",
    title: "Ask client to confirm workstation count",
    objectText: "Speaker 3 will ask the client to confirm the workstation count tomorrow.",
    actor: "Speaker 3",
    deadlineAt: "2026-09-19",
    confidence: 0.96,
  },
  // --- Messy call rules (real phone conversation) ---
  {
    match: /panels? (haven't|have not|still not|not) (come|arrived|there)/i,
    type: "issue",
    fn: "CREATE_ISSUE",
    title: "Electrical panels not delivered",
    objectText: "Electrical panels have not arrived, blocking site readiness before Monday.",
    confidence: 0.93,
  },
  {
    match: /someone check the PO|check the PO status/i,
    type: "action",
    fn: "CREATE_ACTION",
    title: "Check the PO",
    objectText: "Someone will check the purchase order for the electrical panels.",
    confidence: 0.94,
  },
  {
    match: /i'll call manoj tomorrow morning/i,
    type: "action",
    fn: "CREATE_ACTION",
    title: "Call Manoj about HVAC",
    objectText: "Speaker A will call Manoj (HVAC contractor) tomorrow morning.",
    actor: "Speaker A",
    deadlineAt: "2026-09-19",
    confidence: 0.96,
  },
  {
    match: /drawing needs to go before wednesday|send the revised drawing to the client/i,
    type: "commitment",
    fn: "CREATE_COMMITMENT",
    title: "Send revised drawing before Wednesday",
    objectText: "The revised drawing must reach the client before Wednesday, ahead of the Thursday meeting.",
    deadlineAt: "2026-09-23",
    confidence: 0.95,
  },
  {
    match: /i'll send them a message/i,
    type: "action",
    fn: "CREATE_ACTION",
    title: "Message design team",
    objectText: "Speaker A will message the design team about updating the drawing.",
    actor: "Speaker A",
    confidence: 0.9,
  },
  {
    match: /i'll ask them for confirmation/i,
    type: "action",
    fn: "CREATE_ACTION",
    title: "Ask client to confirm workstations",
    objectText: "Speaker A will ask the client to confirm the workstation count before committing.",
    actor: "Speaker A",
    confidence: 0.92,
  },
  // --- Fallback: any spoken sentence becomes a note so recorded demos always
  // produce at least one memory, even when the exact wording misses the rules.
  {
    match: /.{10,}/,
    type: "note",
    fn: "CREATE_NOTE",
    title: "Recorded note",
    objectText: "Speaker noted: \"{text}\".",
    confidence: 0.72,
  },
];

function hashInput(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i);
    h = ((h << 5) - h + c) | 0;
  }
  return Math.abs(h).toString(36);
}

function draftFrom(segment: TranscriptSegment, rule: Rule, index: number): SemanticEventDraft {
  const objectText = rule.objectText.replace(/{text}/g, segment.text);
  const title = rule.title === "Recorded note" ? `${rule.title} #${hashInput(segment.text)}` : rule.title;
  return {
    id: `${segment.conversationId}_draft_${String(index + 1).padStart(2, "0")}`,
    conversationId: segment.conversationId,
    proposedType: rule.type,
    proposedFunction: rule.fn,
    fields: {
      title,
      objectText,
      actor: rule.actor,
      people: rule.actor ? [rule.actor] : [],
      project: "Bangalore Project",
      deadlineAt: rule.deadlineAt,
      status: ["decision", "note", "fact"].includes(rule.type) ? "informational" : "open",
    },
    parserConfidence: rule.confidence,
    evidence: [{
      transcriptSegmentId: segment.id,
      startChar: 0,
      endChar: segment.text.length,
      startMs: segment.startMs,
      endMs: segment.endMs,
      quotedText: segment.text,
    }],
    parserModelVersion: "demo-semantic-parser/1.0.0",
    warnings: [],
    idempotencyKey: `bangalore:${rule.fn.toLowerCase()}:${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  };
}

export class DemoSemanticParser implements SemanticParser {
  async extract(segments: TranscriptSegment[]): Promise<SemanticEventDraft[]> {
    return this.extractSync(segments);
  }

  extractSync(segments: TranscriptSegment[]): SemanticEventDraft[] {
    const drafts: SemanticEventDraft[] = [];
    const seenTitles = new Set<string>();
    for (const segment of segments) {
      const rule = rules.find((candidate) => candidate.match.test(segment.text));
      if (!rule) continue;
      const draft = draftFrom(segment, rule, drafts.length);
      // Never emit the same idea twice from one conversation (e.g. a speaker
      // repeating a commitment in different words).
      if (seenTitles.has(draft.fields.title)) continue;
      seenTitles.add(draft.fields.title);
      drafts.push(draft);
    }
    return drafts;
  }
}

