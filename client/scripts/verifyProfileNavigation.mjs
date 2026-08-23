import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

const utilitySource = await read("../src/utils/profileNavigation.ts");
const navigationSource = await read("../src/Components/NavigationBar.tsx");
const profileSource = await read("../src/Components/Profile.tsx");
const previewSource = await read("../src/Components/MyProfilePreview.tsx");
const matchedProfileSource = await read("../src/Components/MatchedProfile.tsx");
const chatSource = await read("../src/Components/Chat.tsx");
const likesSource = await read("../src/Components/Likes.tsx");
const matchesSource = await read("../src/Components/Matches.tsx");

const { outputText } = ts.transpileModule(utilitySource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
const {
  createInnerProfileNavigationState,
  createProfileNavigationState,
  getOuterProfileNavigationState,
  getSafeParentProfilePath,
  getSafeProfileReturnPath,
} = await import(moduleUrl);

for (const sourcePath of ["/likes", "/matches", "/discover"]) {
  const outerState = createProfileNavigationState({ pathname: sourcePath });
  const innerState = createInnerProfileNavigationState("/profile", outerState);

  assert.deepEqual(outerState, { from: sourcePath });
  assert.deepEqual(innerState, {
    from: sourcePath,
    parentProfile: "/profile",
  });
  assert.equal(getSafeParentProfilePath(innerState), "/profile");

  const restoredOuterState = getOuterProfileNavigationState(innerState);
  assert.deepEqual(restoredOuterState, { from: sourcePath });
  assert.equal(getSafeProfileReturnPath(restoredOuterState), sourcePath);
}

assert.deepEqual(
  createInnerProfileNavigationState("/matched-profile/demo-noa", {
    from: "/chat/demo-noa",
  }),
  {
    from: "/chat/demo-noa",
    parentProfile: "/matched-profile/demo-noa",
  },
);
assert.equal(
  getSafeProfileReturnPath({ from: "/likes?paypal=cancel#boost" }),
  "/likes?paypal=cancel#boost",
);

assert.equal(getSafeParentProfilePath(undefined), null);
assert.equal(getSafeParentProfilePath({ parentProfile: "/discover" }), null);
assert.equal(
  getSafeParentProfilePath({ parentProfile: "https://example.com/profile" }),
  null,
);
assert.equal(
  getSafeParentProfilePath({ parentProfile: "//example.com/profile" }),
  null,
);
assert.equal(createInnerProfileNavigationState("/discover", { from: "/likes" }), undefined);
assert.equal(getOuterProfileNavigationState(undefined), undefined);
assert.equal(getSafeProfileReturnPath(undefined), null);
assert.equal(getSafeProfileReturnPath({ from: "/profile" }), null);
assert.equal(getSafeProfileReturnPath({ from: "https://example.com/likes" }), null);
assert.equal(getSafeProfileReturnPath({ from: "/not-a-tripmatch-route" }), null);

assert.match(navigationSource, /createProfileNavigationState\(location\)/);
assert.match(profileSource, /getSafeProfileReturnPath\(location\.state\) \|\| "\/discover"/);
assert.match(profileSource, /createInnerProfileNavigationState\(/);
assert.match(profileSource, /"\/profile",\s+location\.state/);
assert.match(previewSource, /getSafeParentProfilePath\(location\.state\) \|\| "\/profile"/);
assert.match(previewSource, /getOuterProfileNavigationState\(location\.state\)/);
assert.match(previewSource, /navigate\(parentProfile, \{ replace: true, state: parentState \}\)/);
assert.match(matchedProfileSource, /getSafeProfileReturnPath\(location\.state\) \|\| "\/discover"/);
assert.match(chatSource, /state: \{ from: `\/chat\/\$\{conversationId\}` \}/);
assert.match(likesSource, /state: \{ from: "\/likes" \}/);
assert.match(matchesSource, /state: \{ from: "\/matches" \}/);

console.log("Two-level profile navigation verification passed:", {
  likesHierarchy: true,
  matchesHierarchy: true,
  discoverHierarchy: true,
  directInnerFallsBackToOwnOuterProfile: true,
  matchedParentProfileValidated: true,
  originalSourcePreservedSeparately: true,
  unsafeNavigationRejected: true,
});
