import { UnderstoodConversation } from "@/application/understandConversation";

let latest: UnderstoodConversation | undefined;

export const conversationStore = {
  get(): UnderstoodConversation | undefined {
    return latest;
  },
  set(value: UnderstoodConversation): void {
    latest = value;
  },
};

