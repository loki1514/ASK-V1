import { CanonicalEvent, EventType } from "@/domain/model";

export type ConversationSummary = {
  title: string;
  counts: Partial<Record<EventType, number>>;
  topPriorities: CanonicalEvent[];
  sections: Array<{ type: EventType; title: string; events: CanonicalEvent[] }>;
};

const sectionTitles: Partial<Record<EventType, string>> = {
  decision: "Decisions",
  action: "Actions",
  commitment: "Commitments",
  question: "Open questions",
  requirement: "Requirements",
  issue: "Issues",
  risk: "Risks",
};

const order: EventType[] = ["decision", "action", "commitment", "question", "requirement", "issue", "risk"];

export function renderSummary(events: CanonicalEvent[], title = "Bangalore Project"): ConversationSummary {
  const counts: Partial<Record<EventType, number>> = {};
  for (const event of events) counts[event.type] = (counts[event.type] ?? 0) + 1;
  return {
    title,
    counts,
    topPriorities: events.filter((event) => event.type === "action" || event.type === "requirement").slice(0, 3),
    sections: order
      .map((type) => ({ type, title: sectionTitles[type] ?? type, events: events.filter((event) => event.type === type) }))
      .filter((section) => section.events.length > 0),
  };
}

