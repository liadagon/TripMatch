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

function isSafeReturnPathname(pathname: string) {
  return (
    SAFE_RETURN_PATHS.has(pathname) ||
    /^\/chat\/[^/]+$/.test(pathname) ||
    /^\/matched-profile\/[^/]+$/.test(pathname)
  );
}

function isSafeParentProfilePathname(pathname: string) {
  return pathname === "/profile" || /^\/matched-profile\/[^/]+$/.test(pathname);
}

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

export function getSafeProfileReturnPath(state: unknown) {
  return getSafeStatePath(state, "from", isSafeReturnPathname);
}

export function getSafeParentProfilePath(state: unknown) {
  return getSafeStatePath(
    state,
    "parentProfile",
    isSafeParentProfilePathname,
  );
}

export function createProfileNavigationState(
  location: AppLocation,
): ProfileNavigationState | undefined {
  const from = `${location.pathname}${location.search || ""}${location.hash || ""}`;
  return getSafeProfileReturnPath({ from }) ? { from } : undefined;
}

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

export function getOuterProfileNavigationState(
  innerState: unknown,
): ProfileNavigationState | undefined {
  const from = getSafeProfileReturnPath(innerState);
  return from ? { from } : undefined;
}
