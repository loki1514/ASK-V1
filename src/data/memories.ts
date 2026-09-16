import { CanonicalEvent, MemoryView } from "@/domain/model";
import { demoCanonicalEvents } from "@/data/demoDomain";

export type Memory = MemoryView;

const displayType: Record<CanonicalEvent["type"], MemoryView["type"]> = {
  decision: "Decision",
  action: "Action",
  commitment: "Commitment",
  question: "Question",
  requirement: "Requirement",
  issue: "Issue",
  risk: "Risk",
  approval: "Approval",
  rejection: "Rejection",
  note: "Note",
  fact: "Fact",
};

export function projectEventToMemory(event: CanonicalEvent): MemoryView {
  return {
    id: `memory_${event.id}`,
    eventId: event.id,
    title: event.title,
    content: event.objectText,
    type: displayType[event.type],
    date: new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(event.createdAt)),
    people: event.people,
    project: event.project,
    evidence: event.evidence,
  };
}

export interface MemoryRepository {
  list(): MemoryView[];
}

class DemoMemoryRepository implements MemoryRepository {
  list(): MemoryView[] {
    return demoCanonicalEvents.map(projectEventToMemory);
  }
}

export const memoryRepository: MemoryRepository = new DemoMemoryRepository();
export const memories = memoryRepository.list();

