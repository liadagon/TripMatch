export type DocumentNavigationType =
  | "navigate"
  | "reload"
  | "back_forward"
  | "prerender"
  | "unknown";

type NavigationPerformance = Pick<Performance, "getEntriesByType">;

export function getDocumentNavigationType(
  performanceApi: NavigationPerformance | undefined = globalThis.performance,
): DocumentNavigationType {
  const entry = performanceApi?.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;

  return entry?.type || "unknown";
}

/**
 * Detects history or back-forward-cache restoration that must not reuse rendered account state.
 * @param navigationType Browser navigation classification.
 * @param pageShowPersisted Whether `pageshow` restored a persisted document.
 * @returns True when authentication should be re-established instead of trusted from memory.
 */
export function isDocumentHistoryRestoration(
  navigationType: DocumentNavigationType,
  pageShowPersisted = false,
) {
  return pageShowPersisted || navigationType === "back_forward";
}

export function wasDocumentRestoredThroughHistory() {
  return isDocumentHistoryRestoration(getDocumentNavigationType());
}
