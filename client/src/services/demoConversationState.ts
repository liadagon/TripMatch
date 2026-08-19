const HIDDEN_DEMO_CONVERSATIONS_KEY =
  "tripmatch:hidden-demo-conversations";

function readHiddenConversationIds() {
  try {
    const stored = window.localStorage.getItem(HIDDEN_DEMO_CONVERSATIONS_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export function isDemoConversationHidden(conversationId: string) {
  return readHiddenConversationIds().includes(conversationId);
}

export function hideDemoConversation(conversationId: string) {
  const hiddenIds = new Set(readHiddenConversationIds());
  hiddenIds.add(conversationId);
  window.localStorage.setItem(
    HIDDEN_DEMO_CONVERSATIONS_KEY,
    JSON.stringify([...hiddenIds]),
  );
}
