import { describe, expect, it } from "vitest";
import { normalizeRelativeDate } from "./dateNormalizer";

describe("Deterministic Date Normalizer", () => {
  const refFriday = new Date("2026-09-18T10:00:00Z"); // A Friday

  it("normalizes 'today' to reference date ISO string", () => {
    expect(normalizeRelativeDate("today", refFriday)).toBe("2026-09-18");
  });

  it("normalizes 'tomorrow' to next calendar day", () => {
    expect(normalizeRelativeDate("tomorrow", refFriday)).toBe("2026-09-19");
  });

  it("normalizes 'by Friday' to upcoming Friday", () => {
    // 2026-09-18 is Friday, so upcoming Friday is 2026-09-25
    expect(normalizeRelativeDate("by Friday", refFriday)).toBe("2026-09-25");
  });

  it("normalizes 'next Monday' correctly", () => {
    // Friday + 3 days = Monday 2026-09-21
    expect(normalizeRelativeDate("next Monday", refFriday)).toBe("2026-09-21");
  });

  it("leaves already ISO formatted dates unchanged", () => {
    expect(normalizeRelativeDate("2026-10-31", refFriday)).toBe("2026-10-31");
  });

  it("returns null for non-date expressions", () => {
    expect(normalizeRelativeDate("blue sky", refFriday)).toBeNull();
  });
});
