const HIDDEN_DEMO_CONVERSATIONS_KEY =
  "tripmatch:hidden-demo-conversations";
const BLOCKED_DEMO_USERS_KEY = "tripmatch:blocked-demo-users";

function readStringList(key: string) {
  try {
    const stored = window.localStorage.getItem(key);
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : [];
  } catch {
    return [];
  }
}

export function isDemoConversationHidden(conversationId: string) {
  return readStringList(HIDDEN_DEMO_CONVERSATIONS_KEY).includes(conversationId);
}

export function hideDemoConversation(conversationId: string) {
  const hiddenIds = new Set(readStringList(HIDDEN_DEMO_CONVERSATIONS_KEY));
  hiddenIds.add(conversationId);
  window.localStorage.setItem(
    HIDDEN_DEMO_CONVERSATIONS_KEY,
    JSON.stringify([...hiddenIds]),
  );
}

export function isDemoUserBlocked(userId: string) {
  return readStringList(BLOCKED_DEMO_USERS_KEY).includes(userId);
}

export function setDemoUserBlocked(userId: string, blocked: boolean) {
  const blockedIds = new Set(readStringList(BLOCKED_DEMO_USERS_KEY));

  if (blocked) blockedIds.add(userId);
  else blockedIds.delete(userId);

  window.localStorage.setItem(
    BLOCKED_DEMO_USERS_KEY,
    JSON.stringify([...blockedIds]),
  );
}

export function clearDemoConversationState(storage: Storage = localStorage) {
  storage.removeItem(HIDDEN_DEMO_CONVERSATIONS_KEY);
  storage.removeItem(BLOCKED_DEMO_USERS_KEY);
}
