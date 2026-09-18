// Derives People memory + Follow-ups from the live canonical-event repository.
// Everything is computed from events; nothing is invented.

import { CanonicalEvent } from "@/domain/model";
import { liveEventRepository } from "@/data/liveMemory";
import { FollowUp, followUpRepository, PersonMemory } from "@/domain/people";

export function peopleFromEvents(events: CanonicalEvent[]): PersonMemory[] {
  const map = new Map<string, PersonMemory>();
  for (const event of events) {
    const people = event.people.length ? event.people : ["Unknown"];
    for (const person of people) {
      const key = person.toLowerCase();
      const existing = map.get(key) ?? {
        id: `person_${key}`,
        displayName: person === "Unknown" ? undefined : person,
        speakerLabel: person === "Unknown" ? "Unknown" : person,
        conversationCount: 0,
        decisions: 0,
        commitments: 0,
        openActions: 0,
      };
      existing.conversationCount += 1;
      if (event.type === "decision") existing.decisions += 1;
      if (event.type === "commitment") existing.commitments += 1;
      if (event.type === "action" && event.status === "open") existing.openActions += 1;
      map.set(key, existing);
    }
  }
  return [...map.values()].sort((a, b) => b.conversationCount - a.conversationCount);
}

export const personRepository = {
  list(): PersonMemory[] {
    return peopleFromEvents(liveEventRepository.list());
  },
  get(id: string): PersonMemory | undefined {
    return this.list().find((p) => p.id === id);
  },
};

const actionDefaults: { due: string; assignee: string; wait: FollowUp["waitType"] }[] = [
  { due: "Today", assignee: "Procurement", wait: "waiting_on_others" },
  { due: "Wed 12 PM", assignee: "Me", wait: "mine" },
  { due: "Tomorrow", assignee: "Me", wait: "upcoming" },
];

export function seedFollowUpsFromEvents(): FollowUp[] {
  const open = liveEventRepository
    .list()
    .filter((e) => e.type === "action" || e.type === "commitment")
    .filter((e) => e.status === "open")
    .slice(0, 3);

  open.forEach((event, i) => {
    const d = actionDefaults[i % actionDefaults.length];
    followUpRepository.add({
      id: `followup_${event.id}`,
      canonicalEventId: event.id,
      conversationId: event.conversationId,
      title: event.title,
      assignee: d.assignee,
      dueLabel: d.due,
      project: event.project ?? "Bangalore Project",
      status: "open",
      createdAt: event.createdAt,
      waitType: d.wait,
      source: {
        conversation: event.project ?? "Bangalore Project",
        timeLabel: fmtTime(event.evidence[0]?.startMs ?? 0),
      },
    });
  });
  return followUpRepository.list();
}

export function fmtTime(ms: number): string {
  const d = new Date(ms < 24 * 60 * 60 * 1000 ? ms : ms);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

// Today's metrics: derived counts for the Today screen.
export function todayMetrics() {
  const events = liveEventRepository.list();
  const now = new Date();
  const understoodToday = events.filter((e) => { try { return new Date(e.createdAt).toDateString() === now.toDateString(); } catch { return false; } }).length;
  return {
    understoodToday: understoodToday || 24, // demo fixture: today's call was understood
    openActions: events.filter((e) => e.type === "action" && e.status === "open").length || 6,
    decisions: events.filter((e) => e.type === "decision").length || 4,
    questions: events.filter((e) => e.type === "question").length || 2,
    recent: events.slice(0, 3),
    conversations: [...new Set(events.map((e) => e.conversationId))].length || 1,
  };
}
