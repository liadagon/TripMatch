export const HIDDEN_DEMO_CONVERSATIONS_KEY =
  "tripmatch:hidden-demo-conversations";
export const BLOCKED_DEMO_USERS_KEY = "tripmatch:blocked-demo-users";

const DEMO_INTERACTIONS_PREFIX = "tripmatch:demo-interactions:";

export type DemoSwipeAction = "like" | "skip";

type DemoInteractionState = {
  swipes: Record<string, DemoSwipeAction>;
  matches: string[];
  conversations: string[];
  blocked: string[];
  hiddenConversations: string[];
  dismissed: string[];
};

const EMPTY_STATE: DemoInteractionState = {
  swipes: {},
  matches: [],
  conversations: [],
  blocked: [],
  hiddenConversations: [],
  dismissed: [],
};

function getDefaultStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

function safeStringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function getSafeAccountScope(userId: string) {
  let first = 2166136261;
  let second = 5381;

  for (let index = 0; index < userId.length; index += 1) {
    const code = userId.charCodeAt(index);
    first = Math.imul(first ^ code, 16777619);
    second = Math.imul(second, 33) ^ code;
  }

  return `${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`;
}

export function getDemoInteractionStorageKey(userId: string) {
  return `${DEMO_INTERACTIONS_PREFIX}${getSafeAccountScope(userId)}`;
}

export function getDemoInteractionState(
  userId: string | undefined,
  storage: Storage | null = getDefaultStorage(),
): DemoInteractionState {
  if (!userId || !storage) return { ...EMPTY_STATE, swipes: {} };

  try {
    const stored = storage.getItem(getDemoInteractionStorageKey(userId));
    const parsed: unknown = stored ? JSON.parse(stored) : {};
    const record = parsed && typeof parsed === "object"
      ? parsed as Partial<DemoInteractionState>
      : {};
    const swipes = record.swipes && typeof record.swipes === "object"
      ? Object.fromEntries(
          Object.entries(record.swipes).filter(
            ([demoId, action]) =>
              Boolean(demoId) && (action === "like" || action === "skip"),
          ),
        ) as Record<string, DemoSwipeAction>
      : {};

    return {
      swipes,
      matches: safeStringList(record.matches),
      conversations: safeStringList(record.conversations),
      blocked: safeStringList(record.blocked),
      hiddenConversations: safeStringList(record.hiddenConversations),
      dismissed: safeStringList(record.dismissed),
    };
  } catch {
    return { ...EMPTY_STATE, swipes: {} };
  }
}

function writeDemoInteractionState(
  userId: string,
  state: DemoInteractionState,
  storage: Storage | null = getDefaultStorage(),
) {
  if (!userId || !storage) return;
  storage.setItem(getDemoInteractionStorageKey(userId), JSON.stringify(state));
}

export function getEligibleDemoUserIds(
  userId: string | undefined,
  allDemoUserIds: readonly string[],
  storage: Storage | null = getDefaultStorage(),
) {
  const state = getDemoInteractionState(userId, storage);
  const unavailableIds = new Set([
    ...Object.keys(state.swipes),
    ...state.matches,
    ...state.blocked,
    ...state.dismissed,
  ]);
  return allDemoUserIds.filter((demoId) => !unavailableIds.has(demoId));
}

export function recordDemoSwipe(
  userId: string,
  demoUserId: string,
  action: DemoSwipeAction,
  storage: Storage | null = getDefaultStorage(),
) {
  const state = getDemoInteractionState(userId, storage);
  state.swipes[demoUserId] = action;

  if (action === "like") {
    state.matches = Array.from(new Set([...state.matches, demoUserId]));
    state.conversations = Array.from(
      new Set([...state.conversations, demoUserId]),
    );
    state.dismissed = state.dismissed.filter((id) => id !== demoUserId);
  } else {
    state.dismissed = Array.from(new Set([...state.dismissed, demoUserId]));
    state.matches = state.matches.filter((id) => id !== demoUserId);
    state.conversations = state.conversations.filter((id) => id !== demoUserId);
  }

  writeDemoInteractionState(userId, state, storage);
  return action === "like";
}

export function getDemoMatchedUserIds(
  userId: string | undefined,
  storage: Storage | null = getDefaultStorage(),
) {
  return getDemoInteractionState(userId, storage).matches;
}

export function getDemoConversationUserIds(
  userId: string | undefined,
  storage: Storage | null = getDefaultStorage(),
) {
  const state = getDemoInteractionState(userId, storage);
  const hidden = new Set(state.hiddenConversations);
  return state.conversations.filter((demoId) => !hidden.has(demoId));
}

export function isDemoConversationAvailable(
  userId: string | undefined,
  conversationId: string,
  storage: Storage | null = getDefaultStorage(),
) {
  return getDemoConversationUserIds(userId, storage).includes(conversationId);
}

export function isDemoConversationHidden(
  userId: string | undefined,
  conversationId: string,
  storage: Storage | null = getDefaultStorage(),
) {
  return getDemoInteractionState(userId, storage)
    .hiddenConversations.includes(conversationId);
}

export function hideDemoConversation(
  userId: string,
  conversationId: string,
  storage: Storage | null = getDefaultStorage(),
) {
  const state = getDemoInteractionState(userId, storage);
  state.hiddenConversations = Array.from(
    new Set([...state.hiddenConversations, conversationId]),
  );
  writeDemoInteractionState(userId, state, storage);
}

export function isDemoUserBlocked(
  userId: string | undefined,
  demoUserId: string,
  storage: Storage | null = getDefaultStorage(),
) {
  return getDemoInteractionState(userId, storage).blocked.includes(demoUserId);
}

export function getBlockedDemoUserIds(
  userId: string | undefined,
  storage: Storage | null = getDefaultStorage(),
) {
  return getDemoInteractionState(userId, storage).blocked;
}

export function setDemoUserBlocked(
  userId: string,
  demoUserId: string,
  blocked: boolean,
  storage: Storage | null = getDefaultStorage(),
) {
  const state = getDemoInteractionState(userId, storage);
  state.blocked = blocked
    ? Array.from(new Set([...state.blocked, demoUserId]))
    : state.blocked.filter((id) => id !== demoUserId);
  writeDemoInteractionState(userId, state, storage);
}

export function clearDemoConversationState(
  userId: string | undefined,
  storage: Storage | null = getDefaultStorage(),
) {
  if (!storage) return;
  if (userId) storage.removeItem(getDemoInteractionStorageKey(userId));

  // Remove obsolete global keys so deleted-account state cannot be inherited.
  storage.removeItem(HIDDEN_DEMO_CONVERSATIONS_KEY);
  storage.removeItem(BLOCKED_DEMO_USERS_KEY);
}
