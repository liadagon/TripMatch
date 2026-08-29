export const TRIPMATCH_TOKEN_KEY = "tripmatch_token";

// Centralized JWT access keeps authentication tab-scoped and prevents legacy
// localStorage state from becoming a second source of truth.
function getSessionTokenStorage() {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

export function getAuthToken(
  storage: Storage | null = getSessionTokenStorage(),
) {
  return storage?.getItem(TRIPMATCH_TOKEN_KEY) ?? null;
}

export function setAuthToken(
  token: string,
  storage: Storage | null = getSessionTokenStorage(),
) {
  storage?.setItem(TRIPMATCH_TOKEN_KEY, token);
}

export function removeAuthToken(
  storage: Storage | null = getSessionTokenStorage(),
) {
  storage?.removeItem(TRIPMATCH_TOKEN_KEY);
}

/** Removes the pre-session-isolation token without reading or migrating it. */
export function removeLegacyLocalAuthToken() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TRIPMATCH_TOKEN_KEY);
  }
}
