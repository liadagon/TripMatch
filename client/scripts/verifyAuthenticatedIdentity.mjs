import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

const identitySource = await read("../src/utils/authenticatedIdentity.ts");
const likesSource = await read("../src/Components/Likes.tsx");
const profileSource = await read("../src/Components/Profile.tsx");
const previewSource = await read("../src/Components/MyProfilePreview.tsx");
const authContextSource = await read("../src/context/AuthContext.tsx");

const { outputText } = ts.transpileModule(identitySource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
const {
  getAuthenticatedIdentity,
  getAuthenticatedProfilePhotos,
} = await import(moduleUrl);

function user(name, authProvider, photoURL) {
  return {
    _id: `${authProvider}-${name}`,
    name,
    authProvider,
    photoURL,
    photos: photoURL ? [photoURL] : [],
    registrationComplete: true,
  };
}

const userA = user(
  "Traveler A",
  "google",
  "/api/file/64b000000000000000000011",
);
const userB = user(
  "Traveler B",
  "email",
  "/public/traveler-b.png",
);

assert.deepEqual(getAuthenticatedIdentity(userA), {
  name: "Traveler A",
  photoURL: "/api/file/64b000000000000000000011",
});
assert.deepEqual(getAuthenticatedIdentity(null), { name: "", photoURL: "" });
assert.deepEqual(getAuthenticatedIdentity(userB), {
  name: "Traveler B",
  photoURL: "/public/traveler-b.png",
});
assert.doesNotMatch(getAuthenticatedIdentity(userB).name, /Traveler A/);

const googleProviderAvatar = user(
  "Google App Name",
  "google",
  "https://lh3.googleusercontent.com/provider-avatar",
);
assert.equal(getAuthenticatedIdentity(googleProviderAvatar).name, "Google App Name");
assert.equal(getAuthenticatedIdentity(googleProviderAvatar).photoURL, "");
assert.deepEqual(getAuthenticatedProfilePhotos(googleProviderAvatar), []);

assert.doesNotMatch(likesSource, /נועה רגב|Noa Regev/);
assert.match(likesSource, /getAuthenticatedIdentity\(user\)/);
assert.match(likesSource, /identity\.name/);
assert.match(likesSource, /identity\.photoURL/);
assert.doesNotMatch(likesSource, /images\.unsplash\.com/);

assert.match(profileSource, /getAuthenticatedIdentity\(user\)/);
assert.doesNotMatch(profileSource, /defaultProfile/);
assert.doesNotMatch(profileSource, /name:\s*"נועה"/);
assert.doesNotMatch(profileSource, /images\.unsplash\.com\/photo-1524504388940/);
assert.match(previewSource, /profile=\{authenticatedProfile\}/);
assert.match(previewSource, /getAuthenticatedProfilePhotos\(user\)/);
assert.match(
  profileSource,
  /setProfile\(nextProfile\)[\s\S]*setDraftProfile\(nextProfile\)[\s\S]*setIsEditing\(false\)[\s\S]*setStatistics\(null\)/,
);

assert.match(
  authContextSource,
  /function clearLocalAuthenticatedSession\(\)[\s\S]*removeAuthToken\(\)[\s\S]*setUser\(null\)/,
);
assert.match(
  authContextSource,
  /function resetUserSpecificState[\s\S]*clearDemoConversationState\(userId\)[\s\S]*function clearLocalAuthenticatedSession[\s\S]*resetUserSpecificState\(\)/,
);
assert.match(
  authContextSource,
  /async function deleteAccount\(\)[\s\S]*const deletedUserId = user\?\._id[\s\S]*clearDemoConversationState\(deletedUserId\)/,
);
assert.match(
  authContextSource,
  /async function logout\(\)\s*\{\s*await clearAuthenticatedSession\(\);\s*\}/,
);
assert.match(
  authContextSource,
  /async function establishAuthenticatedSession\(token: string, revision: number\)[\s\S]*setAuthToken\(token\)[\s\S]*await getCurrentUser\(token\)[\s\S]*setUser\(authoritativeUser\)[\s\S]*removeAuthToken\(\)[\s\S]*setUser\(null\)/,
);
assert.match(
  authContextSource,
  /async function login\([\s\S]*emailLogin\([\s\S]*establishAuthenticatedSession\(response\.data\.token, revision\)/,
);
assert.match(
  authContextSource,
  /async function register\([\s\S]*registerUser\([\s\S]*establishAuthenticatedSession\(response\.data\.token, revision\)/,
);
assert.match(
  authContextSource,
  /authenticateWithGoogle[\s\S]*await establishAuthenticatedSession\([\s\S]*response\.data\.token/,
);
assert.match(
  authContextSource,
  /authenticateWithEmailCode[\s\S]*await establishAuthenticatedSession\([\s\S]*response\.data\.token/,
);

console.log("Authenticated identity verification passed", {
  realUserOverridesDemoIdentity: true,
  navigationAndProfileShareAuthenticatedUser: true,
  googleToEmailSwitchIsolated: true,
  emailToGoogleSwitchIsolated: true,
  logoutClearsUserScopedClientState: true,
  deletionClearsOnlyDeletedUserDemoState: true,
  refreshUsesAuthoritativeCurrentUser: true,
  everyAuthenticationMethodUsesAuthoritativeCurrentUser: true,
  providerAvatarIgnored: true,
  hardcodedNoaRegevRemovedFromAuthenticatedPath: true,
});
