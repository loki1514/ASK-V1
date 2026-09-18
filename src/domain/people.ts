// PRD-001 §8–10: People + Follow-up domain. Derived from canonical events,
// never guessed. Unknown speakers remain Unknown.

export type PersonMemory = {
  id: string;
  displayName?: string; // absent => Unknown
  speakerLabel: string; // e.g. "Speaker 1"
  conversationCount: number;
  decisions: number;
  commitments: number;
  openActions: number;
};

export type FollowUpStatus = "open" | "done" | "snoozed";

export type FollowUp = {
  id: string;
  canonicalEventId: string; // traceable to source memory
  conversationId: string;
  title: string;
  assignee: string; // "Me" | named person | role
  dueLabel: string; // "Today" | "Wed 12 PM" | "Tomorrow"
  project?: string;
  status: FollowUpStatus;
  createdAt: string;
  source?: { conversation: string; timeLabel: string };
  waitType: "mine" | "waiting_on_others" | "upcoming";
};

// In-memory follow-up store (the product surface; later persistent).
const followUps = new Map<string, FollowUp>();

export const followUpRepository = {
  list(): FollowUp[] {
    return [...followUps.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  },
  byStatus(status: FollowUpStatus): FollowUp[] {
    return this.list().filter((f) => f.status === status);
  },
  add(followUp: FollowUp): FollowUp {
    followUps.set(followUp.id, followUp);
    return followUp;
  },
  update(id: string, patch: Partial<FollowUp>): void {
    const existing = followUps.get(id);
    if (existing) followUps.set(id, { ...existing, ...patch });
  },
  clear(): void {
    followUps.clear();
  },
};
