type AppLocation = {
  pathname: string;
  search?: string;
  hash?: string;
};

export type ProfileNavigationState = {
  from: string;
};

export type InnerProfileNavigationState = {
  from?: string;
  parentProfile: string;
};

const SAFE_RETURN_PATHS = new Set([
  "/discover",
  "/likes",
  "/matches",
  "/messages",
  "/matches-map",
  "/profile-preview",
  "/blocked-users",
  "/boost/return",
]);

/** Restricts profile return targets to known application routes. */
function isSafeReturnPathname(pathname: string) {
  return (
    SAFE_RETURN_PATHS.has(pathname) ||
    /^\/chat\/[^/]+$/.test(pathname) ||
    /^\/matched-profile\/[^/]+$/.test(pathname)
  );
}

/** Restricts nested-profile parents to profile routes. */
function isSafeParentProfilePathname(pathname: string) {
  return pathname === "/profile" || /^\/matched-profile\/[^/]+$/.test(pathname);
}

/**
 * Extracts a same-origin application path from untrusted router state.
 * @returns A validated relative path, or null when the state is unsafe.
 */
function getSafeStatePath(
  state: unknown,
  key: "from" | "parentProfile",
  isSafePathname: (pathname: string) => boolean,
) {
  if (!state || typeof state !== "object" || !(key in state)) return null;

  const value = (state as Record<string, unknown>)[key];
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  try {
    const url = new URL(value, "https://tripmatch.local");
    if (url.origin !== "https://tripmatch.local" || !isSafePathname(url.pathname)) {
      return null;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/** Returns a validated outer return path from profile navigation state. */
export function getSafeProfileReturnPath(state: unknown) {
  return getSafeStatePath(state, "from", isSafeReturnPathname);
}

/** Returns a validated parent-profile path from nested navigation state. */
export function getSafeParentProfilePath(state: unknown) {
  return getSafeStatePath(
    state,
    "parentProfile",
    isSafeParentProfilePathname,
  );
}

/** Creates safe router state for opening a profile from the current location. */
export function createProfileNavigationState(
  location: AppLocation,
): ProfileNavigationState | undefined {
  const from = `${location.pathname}${location.search || ""}${location.hash || ""}`;
  return getSafeProfileReturnPath({ from }) ? { from } : undefined;
}

/** Preserves safe outer navigation while entering a nested profile. */
export function createInnerProfileNavigationState(
  parentProfile: string,
  outerState: unknown,
): InnerProfileNavigationState | undefined {
  const safeParentProfile = getSafeParentProfilePath({ parentProfile });
  if (!safeParentProfile) return undefined;

  const from = getSafeProfileReturnPath(outerState);
  return {
    ...(from ? { from } : {}),
    parentProfile: safeParentProfile,
  };
}

/** Restores safe outer navigation state when leaving a nested profile. */
export function getOuterProfileNavigationState(
  innerState: unknown,
): ProfileNavigationState | undefined {
  const from = getSafeProfileReturnPath(innerState);
  return from ? { from } : undefined;
}
