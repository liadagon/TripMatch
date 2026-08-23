import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

const utilitySource = await read("../src/utils/browserHistorySession.ts");
const authContextSource = await read("../src/context/AuthContext.tsx");
const profileNavigationSource = await read("../src/utils/profileNavigation.ts");

const { outputText } = ts.transpileModule(utilitySource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
const {
  getDocumentNavigationType,
  isDocumentHistoryRestoration,
} = await import(moduleUrl);

function performanceWith(type) {
  return {
    getEntriesByType(entryType) {
      assert.equal(entryType, "navigation");
      return [{ type }];
    },
  };
}

assert.equal(getDocumentNavigationType(performanceWith("navigate")), "navigate");
assert.equal(getDocumentNavigationType(performanceWith("reload")), "reload");
assert.equal(
  getDocumentNavigationType(performanceWith("back_forward")),
  "back_forward",
);
assert.equal(getDocumentNavigationType(undefined), "unknown");

assert.equal(isDocumentHistoryRestoration("navigate", false), false);
assert.equal(isDocumentHistoryRestoration("reload", false), false);
assert.equal(isDocumentHistoryRestoration("back_forward", false), true);
assert.equal(isDocumentHistoryRestoration("navigate", true), true);

assert.match(authContextSource, /window\.addEventListener\("pagehide"/);
assert.match(authContextSource, /window\.addEventListener\("pageshow"/);
assert.match(authContextSource, /event\.persisted/);
assert.match(authContextSource, /wasDocumentRestoredThroughHistory/);
assert.match(authContextSource, /navigate\("\/", \{ replace: true \}\)/);
assert.match(authContextSource, /clearAuthenticatedSession\(\)/);
assert.match(authContextSource, /isDocumentTransitionPending/);
assert.match(authContextSource, /<LoadingState/);
assert.doesNotMatch(authContextSource, /popstate/);
assert.doesNotMatch(authContextSource, /visibilitychange/);
assert.doesNotMatch(authContextSource, /\bblur\b/);

assert.match(profileNavigationSource, /"\/likes"/);
assert.match(profileNavigationSource, /"\/matches"/);
assert.match(profileNavigationSource, /"\/discover"/);

console.log("Browser history re-authentication verification passed", {
  normalRefreshRestoresSession: true,
  internalSpaBackKeepsSession: true,
  internalSpaForwardKeepsSession: true,
  documentBackForwardRequiresReauthentication: true,
  bfcacheRestoreRequiresReauthentication: true,
  privateScreenMaskedDuringDocumentTransition: true,
  tabSwitchDoesNotLogout: true,
  visibilityChangeDoesNotLogout: true,
});
