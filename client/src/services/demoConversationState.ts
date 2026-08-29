export const HIDDEN_DEMO_CONVERSATIONS_KEY =
  "tripmatch:hidden-demo-conversations";
export const BLOCKED_DEMO_USERS_KEY = "tripmatch:blocked-demo-users";

const DEMO_INTERACTIONS_PREFIX = "tripmatch:demo-interactions:";

export type DemoSwipeAction = "like" | "skip";

export type DemoMessage = {
  id: string;
  from: "me" | "them";
  text: string;
  time: string;
};

type DemoInteractionState = {
  swipes: Record<string, DemoSwipeAction>;
  matches: string[];
  conversations: string[];
  blocked: string[];
  hiddenConversations: string[];
  dismissed: string[];
  messages: Record<string, DemoMessage[]>;
};

const EMPTY_STATE: DemoInteractionState = {
  swipes: {},
  matches: [],
  conversations: [],
  blocked: [],
  hiddenConversations: [],
  dismissed: [],
  messages: {},
};

/** Returns persistent browser storage when it is available. */
function getDefaultStorage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

/** Keeps only string identifiers from untrusted persisted data. */
function safeStringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

/** Validates persisted demo-message collections before they enter UI state. */
function safeMessages(value: unknown): Record<string, DemoMessage[]> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).map(([demoId, messages]) => [
      demoId,
      Array.isArray(messages)
        ? messages.filter((message): message is DemoMessage => {
            if (!message || typeof message !== "object") return false;
            const candidate = message as Partial<DemoMessage>;
            return typeof candidate.id === "string" &&
              (candidate.from === "me" || candidate.from === "them") &&
              typeof candidate.text === "string" &&
              typeof candidate.time === "string";
          })
        : [],
    ]),
  );
}

/** Encodes an account identifier for use inside a browser-storage key. */
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

/** Returns the account-scoped key used for demo interactions. */
export function getDemoInteractionStorageKey(userId: string) {
  return `${DEMO_INTERACTIONS_PREFIX}${getSafeAccountScope(userId)}`;
}

/** Parses and normalizes the current account's persisted demo state. */
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
      messages: safeMessages(record.messages),
    };
  } catch {
    return { ...EMPTY_STATE, swipes: {} };
  }
}

/** Persists one normalized demo-state snapshot for the authenticated account. */
function writeDemoInteractionState(
  userId: string,
  state: DemoInteractionState,
  storage: Storage | null = getDefaultStorage(),
) {
  if (!userId || !storage) return;
  storage.setItem(getDemoInteractionStorageKey(userId), JSON.stringify(state));
}

/** Filters demo profiles already swiped, dismissed or blocked by this account. */
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

/** Records a demo swipe and applies the same reciprocal-match lifecycle as real data. */
export function recordDemoSwipe(
  userId: string,
  demoUserId: string,
  action: DemoSwipeAction,
  demoHasLikedCurrentUser = false,
  storage: Storage | null = getDefaultStorage(),
) {
  const state = getDemoInteractionState(userId, storage);
  state.swipes[demoUserId] = action;

  if (action === "like" && demoHasLikedCurrentUser) {
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
  return action === "like" && demoHasLikedCurrentUser;
}

/** Returns demo users currently matched with the authenticated account. */
export function getDemoMatchedUserIds(
  userId: string | undefined,
  storage: Storage | null = getDefaultStorage(),
) {
  return getDemoInteractionState(userId, storage).matches;
}

/** Returns accessible, non-hidden demo conversation identifiers. */
export function getDemoConversationUserIds(
  userId: string | undefined,
  storage: Storage | null = getDefaultStorage(),
) {
  const state = getDemoInteractionState(userId, storage);
  const hidden = new Set(state.hiddenConversations);
  return state.conversations.filter((demoId) => !hidden.has(demoId));
}

/** Returns persisted messages for an accessible demo conversation. */
export function getDemoMessages(
  userId: string | undefined,
  demoUserId: string,
  storage: Storage | null = getDefaultStorage(),
) {
  if (!isDemoConversationAvailable(userId, demoUserId, storage)) return [];
  return getDemoInteractionState(userId, storage).messages[demoUserId] || [];
}

/** Appends a message after verifying that the demo conversation remains accessible. */
export function appendDemoMessage(
  userId: string,
  demoUserId: string,
  message: DemoMessage,
  storage: Storage | null = getDefaultStorage(),
) {
  if (!isDemoConversationAvailable(userId, demoUserId, storage)) {
    throw new Error("Demo conversation is not available");
  }
  if (isDemoUserBlocked(userId, demoUserId, storage)) {
    throw new Error("Messages are disabled for this blocked relationship");
  }
  const state = getDemoInteractionState(userId, storage);
  state.messages[demoUserId] = [...(state.messages[demoUserId] || []), message];
  writeDemoInteractionState(userId, state, storage);
  return state.messages[demoUserId];
}

/** Indicates whether a demo conversation belongs to the current account. */
export function isDemoConversationAvailable(
  userId: string | undefined,
  conversationId: string,
  storage: Storage | null = getDefaultStorage(),
) {
  return getDemoConversationUserIds(userId, storage).includes(conversationId);
}

/** Indicates whether this account locally cleared a demo conversation. */
export function isDemoConversationHidden(
  userId: string | undefined,
  conversationId: string,
  storage: Storage | null = getDefaultStorage(),
) {
  return getDemoInteractionState(userId, storage)
    .hiddenConversations.includes(conversationId);
}

/** Hides a demo conversation for the current account without affecting others. */
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

/** Indicates whether the current account blocked a demo user. */
export function isDemoUserBlocked(
  userId: string | undefined,
  demoUserId: string,
  storage: Storage | null = getDefaultStorage(),
) {
  return getDemoInteractionState(userId, storage).blocked.includes(demoUserId);
}

/** Returns every demo user blocked by the current account. */
export function getBlockedDemoUserIds(
  userId: string | undefined,
  storage: Storage | null = getDefaultStorage(),
) {
  return getDemoInteractionState(userId, storage).blocked;
}

/** Updates a demo block while preserving the account-scoped interaction state. */
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

/** Removes only the selected account's persisted demo interactions. */
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
