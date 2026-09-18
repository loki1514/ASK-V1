// PRD-001 §12 Memory Graph: how the things ASK knows are connected.
// Nodes and edges are derived from canonical events — never invented.

import { CanonicalEvent } from "@/domain/model";
import { liveEventRepository } from "@/data/liveMemory";

export type MemoryNodeType = "person" | "project" | "conversation" | "decision" | "action" | "issue" | "requirement" | "topic";

export type MemoryNode = {
  id: string;
  label: string;
  type: MemoryNodeType;
  events: number;
};

export type MemoryEdge = {
  sourceId: string;
  targetId: string;
  relationship: string;
};

export function buildMemoryGraph(events: CanonicalEvent[]) {
  const nodes = new Map<string, MemoryNode>();
  const edges = new Map<string, MemoryEdge>();

  const addNode = (id: string, label: string, type: MemoryNodeType) => {
    const existing = nodes.get(id);
    if (existing) {
      existing.events += 1;
      return;
    }
    nodes.set(id, { id, label, type, events: 1 });
  };
  const addEdge = (a: string, b: string, relationship: string) => {
    const key = [a, b].sort().join("::");
    if (!edges.has(key)) edges.set(key, { sourceId: a, targetId: b, relationship });
  };

  for (const event of events) {
    // Project node
    const project = event.project ?? "Bangalore Project";
    addNode(`project_${project}`, project, "project");

    // People nodes
    for (const person of event.people) {
      addNode(`person_${person.toLowerCase()}`, person, "person");
      addEdge(project, person, "involved");
    }

    // Event node by type
    const type: MemoryNodeType =
      event.type === "decision" ? "decision"
      : event.type === "action" ? "action"
      : event.type === "issue" ? "issue"
      : event.type === "requirement" ? "requirement"
      : "topic";
    addNode(`event_${event.id}`, event.title, type);
    addEdge(project, event.title, "contains");

    // People ↔ event edges
    for (const person of event.people) {
      addNode(`person_${person.toLowerCase()}`, person, "person");
      addEdge(person, event.title, event.type);
    }
  }

  return {
    nodes: [...nodes.values()],
    edges: [...edges.values()],
  };
}

export function memoryGraph() {
  return buildMemoryGraph(liveEventRepository.list());
}
