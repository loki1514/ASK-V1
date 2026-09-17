const functionLabelMap: Record<string, string> = {
  CREATE_DECISION: "Decision",
  CREATE_ACTION: "Action item",
  CREATE_COMMITMENT: "Commitment",
  CREATE_QUESTION: "Question",
  CREATE_REQUIREMENT: "Requirement",
  CREATE_ISSUE: "Issue",
  CREATE_RISK: "Risk",
  CREATE_APPROVAL: "Approval",
  CREATE_REJECTION: "Rejection",
  CREATE_NOTE: "Note",
  UPSERT_FACT: "Fact entry",
};

/**
 * Returns a clean, human-readable label for internal function identifiers.
 */
export function formatFunctionName(name: string): string {
  if (functionLabelMap[name]) {
    return functionLabelMap[name];
  }
  return name
    .replace(/^CREATE_/, "")
    .replace(/^UPSERT_/, "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
