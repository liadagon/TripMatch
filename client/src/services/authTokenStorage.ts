export const TRIPMATCH_TOKEN_KEY = "tripmatch_token";

// Centralized JWT access keeps authentication tab-scoped and prevents legacy
// localStorage state from becoming a second source of truth.
/** Returns tab-scoped token storage when running in a browser. */
function getSessionTokenStorage() {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

/** Reads the current tab's TripMatch JWT. */
export function getAuthToken(
  storage: Storage | null = getSessionTokenStorage(),
) {
  return storage?.getItem(TRIPMATCH_TOKEN_KEY) ?? null;
}

/** Replaces the current tab's TripMatch JWT. */
export function setAuthToken(
  token: string,
  storage: Storage | null = getSessionTokenStorage(),
) {
  storage?.setItem(TRIPMATCH_TOKEN_KEY, token);
}

/** Removes the TripMatch JWT from the supplied tab-scoped storage. */
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
