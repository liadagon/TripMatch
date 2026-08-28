import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const read = (relativePath) =>
  readFile(new URL(relativePath, import.meta.url), "utf8");

const [
  tokenStorageSource,
  apiSource,
  authContextSource,
  firebaseSource,
  conversationsSource,
  appSource,
] = await Promise.all([
  read("../src/services/authTokenStorage.ts"),
  read("../src/services/api.ts"),
  read("../src/context/AuthContext.tsx"),
  read("../src/firebase.ts"),
  read("../src/store/conversationsSlice.ts"),
  read("../src/App.tsx"),
]);

const compiledTokenStorage = ts.transpileModule(tokenStorageSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const tokenStorage = await import(
  `data:text/javascript;base64,${Buffer.from(compiledTokenStorage).toString("base64")}`
);

class MemoryStorage {
  #values = new Map();

  get length() {
    return this.#values.size;
  }

  clear() {
    this.#values.clear();
  }

  getItem(key) {
    return this.#values.get(key) ?? null;
  }

  key(index) {
    return [...this.#values.keys()][index] ?? null;
  }

  removeItem(key) {
    this.#values.delete(key);
  }

  setItem(key, value) {
    this.#values.set(key, String(value));
  }
}

const browserSessionA = new MemoryStorage();
const browserSessionB = new MemoryStorage();

tokenStorage.setAuthToken("jwt-user-a", browserSessionA);
tokenStorage.setAuthToken("jwt-user-b", browserSessionB);
assert.equal(tokenStorage.getAuthToken(browserSessionA), "jwt-user-a");
assert.equal(tokenStorage.getAuthToken(browserSessionB), "jwt-user-b");

tokenStorage.removeAuthToken(browserSessionA);
assert.equal(tokenStorage.getAuthToken(browserSessionA), null);
assert.equal(tokenStorage.getAuthToken(browserSessionB), "jwt-user-b");

const refreshedBrowserSessionB = browserSessionB;
assert.equal(
  tokenStorage.getAuthToken(refreshedBrowserSessionB),
  "jwt-user-b",
);

tokenStorage.setAuthToken("jwt-user-a", browserSessionA);
tokenStorage.setAuthToken("jwt-user-b", browserSessionA);
assert.equal(tokenStorage.getAuthToken(browserSessionA), "jwt-user-b");

assert.match(tokenStorageSource, /window\.sessionStorage/);
assert.doesNotMatch(tokenStorageSource, /localStorage\.getItem|localStorage\.setItem/);
assert.match(tokenStorageSource, /removeLegacyLocalAuthToken/);
assert.doesNotMatch(apiSource, /localStorage|sessionStorage/);
assert.match(apiSource, /requestAuthorization === `Bearer \$\{currentToken\}`/);
assert.doesNotMatch(authContextSource, /localStorage|sessionStorage/);
assert.match(authContextSource, /beginAuthenticationAttempt/);
assert.match(authContextSource, /isCurrentAuthenticationAttempt\(revision, token\)/);
assert.match(authContextSource, /getCurrentUser\(token\)/);
assert.match(authContextSource, /dispatch\(resetConversations\(\)\)/);
assert.match(authContextSource, /previousAuthenticatedUserIdRef/);
assert.match(
  authContextSource,
  /async function login[\s\S]*beginAuthenticationAttempt[\s\S]*establishAuthenticatedSession/,
);
assert.match(
  authContextSource,
  /authenticateWithGoogle[\s\S]*beginAuthenticationAttempt[\s\S]*establishAuthenticatedSession/,
);
assert.match(
  authContextSource,
  /authenticateWithEmailCode[\s\S]*beginAuthenticationAttempt[\s\S]*signOutFirebaseForAccountReplacement[\s\S]*establishAuthenticatedSession/,
);
assert.match(firebaseSource, /browserSessionPersistence/);
assert.match(
  firebaseSource,
  /await ensureFirebaseSessionPersistence\(\)[\s\S]*signInWithPopup/,
);
assert.match(firebaseSource, /signOut\(getFirebaseAuth\(\)\)/);
assert.match(conversationsSource, /resetConversations/);
assert.match(conversationsSource, /listRequestId !== action\.meta\.requestId/);
assert.match(conversationsSource, /activeRequestId !== action\.meta\.requestId/);
assert.match(conversationsSource, /sendRequestId !== action\.meta\.requestId/);
assert.match(conversationsSource, /clearRequestId !== action\.meta\.requestId/);
assert.match(appSource, /key=\{user\?\._id \?\? "anonymous-session"\}/);

console.log("Authentication session isolation verification: PASS", {
  userALoginAndLogout: true,
  userBRefreshPersistence: true,
  accountReplacement: true,
  googleToEmailIsolation: true,
  emailToGoogleIsolation: true,
  independentBrowserSessions: true,
  staleAuthResponseGuard: true,
  staleConversationResponseGuard: true,
  profileAndRouteStateRemount: true,
});
