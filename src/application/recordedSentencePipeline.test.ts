import { describe, expect, it } from "vitest";
import { understandConversation, SessionCanonicalEventRepository } from "./understandConversation";
import { InMemoryCanonicalEventRepository } from "@/infrastructure/memory/InMemoryCanonicalEventRepository";

describe("recorded sentence end-to-end pipeline", () => {
  it("turns a recorded sentence into a canonical event", async () => {
    const upstream = new InMemoryCanonicalEventRepository();
    const out = await understandConversation({
      transcript: "[00:00] SPEAKER_A\nI'll check the PO status with procurement today and confirm by 5 PM.",
      source: "recorded",
      repository: new SessionCanonicalEventRepository(upstream),
      now: () => new Date(),
    });

    expect(out.conversation.source).toBe("recorded");
    expect(out.conversation.segments).toHaveLength(1);
    expect(out.drafts).toHaveLength(1);
    expect(out.drafts[0].proposedFunction).toBe("CREATE_ACTION");
    expect(out.events).toHaveLength(1);
    expect(out.events[0].functionName).toBe("CREATE_ACTION");
    expect(out.events[0].title).toBe("Check PO status");
    expect(upstream.list()).toHaveLength(1);
  });

  it("falls back to a note when the recorded sentence does not match a specific rule", async () => {
    const upstream = new InMemoryCanonicalEventRepository();
    const out = await understandConversation({
      transcript: "[00:00] SPEAKER_A\nThis is just a test recording for the demo.",
      source: "recorded",
      repository: new SessionCanonicalEventRepository(upstream),
      now: () => new Date(),
    });

    expect(out.events).toHaveLength(1);
    expect(out.events[0].functionName).toBe("CREATE_NOTE");
  });
});
