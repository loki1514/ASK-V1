import { describe, expect, it } from "vitest";
import { DemoSemanticParser } from "./DemoSemanticParser";
import { TranscriptSegment } from "@/domain/model";

function segment(text: string): TranscriptSegment {
  return {
    id: "seg_01",
    conversationId: "conv_test",
    startMs: 0,
    endMs: 1000,
    text,
  };
}

describe("DemoSemanticParser", () => {
  it("extracts a known action rule", () => {
    const parser = new DemoSemanticParser();
    const drafts = parser.extractSync([segment("I'll check the PO status with procurement today and confirm by 5 PM.")]);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].proposedFunction).toBe("CREATE_ACTION");
    expect(drafts[0].fields.title).toBe("Check PO status");
  });

  it("falls back to a note for arbitrary recorded speech", () => {
    const parser = new DemoSemanticParser();
    const drafts = parser.extractSync([segment("This is just a random sentence being recorded for the demo.")]);
    expect(drafts).toHaveLength(1);
    expect(drafts[0].proposedFunction).toBe("CREATE_NOTE");
    expect(drafts[0].fields.objectText).toContain("This is just a random sentence");
  });

  it("ignores very short noise", () => {
    const parser = new DemoSemanticParser();
    const drafts = parser.extractSync([segment("ok")]);
    expect(drafts).toHaveLength(0);
  });
});
