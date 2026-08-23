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

export function isDocumentHistoryRestoration(
  navigationType: DocumentNavigationType,
  pageShowPersisted = false,
) {
  return pageShowPersisted || navigationType === "back_forward";
}

export function wasDocumentRestoredThroughHistory() {
  return isDocumentHistoryRestoration(getDocumentNavigationType());
}
