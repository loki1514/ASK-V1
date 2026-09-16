import { EventType, FunctionName, SemanticEventDraft } from "@/domain/model";

export type ConfirmationClass =
  | "none"
  | "user_before_commit"
  | "user_before_external_action";

export type FunctionDefinition = {
  name: FunctionName;
  eventType: EventType;
  requiredFields: Array<keyof SemanticEventDraft["fields"]>;
  confirmation: ConfirmationClass;
  defaultStatus: "open" | "informational";
  renderSummary: (draft: SemanticEventDraft) => string;
};

const definition = (
  name: FunctionName,
  eventType: EventType,
  requiredFields: Array<keyof SemanticEventDraft["fields"]>,
  defaultStatus: "open" | "informational",
  confirmation: ConfirmationClass = "none",
): FunctionDefinition => ({
  name,
  eventType,
  requiredFields,
  defaultStatus,
  confirmation,
  renderSummary: (draft) => draft.fields.objectText.trim(),
});

const definitions: FunctionDefinition[] = [
  definition("CREATE_DECISION", "decision", ["title", "objectText"], "informational"),
  definition("CREATE_ACTION", "action", ["title", "objectText", "actor"], "open"),
  definition("CREATE_COMMITMENT", "commitment", ["title", "objectText", "actor"], "open"),
  definition("CREATE_QUESTION", "question", ["title", "objectText"], "open"),
  definition("CREATE_REQUIREMENT", "requirement", ["title", "objectText"], "open"),
  definition("CREATE_ISSUE", "issue", ["title", "objectText"], "open"),
  definition("CREATE_RISK", "risk", ["title", "objectText"], "open"),
  definition("CREATE_APPROVAL", "approval", ["title", "objectText"], "informational"),
  definition("CREATE_REJECTION", "rejection", ["title", "objectText"], "informational"),
  definition("CREATE_NOTE", "note", ["title", "objectText"], "informational"),
  definition("UPSERT_FACT", "fact", ["title", "objectText"], "informational"),
  definition(
    "SUPERSEDE_EVENT",
    "fact",
    ["title", "objectText", "supersedesEventId"],
    "informational",
    "user_before_commit",
  ),
];

export const FUNCTION_REGISTRY: ReadonlyMap<FunctionName, FunctionDefinition> =
  new Map(definitions.map((item) => [item.name, item]));

export function getFunctionDefinition(name: FunctionName): FunctionDefinition | undefined {
  return FUNCTION_REGISTRY.get(name);
}

