import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const read = (relativePath) =>
  readFile(new URL(relativePath, import.meta.url), "utf8");

const [stateSource, discoverSource, matchesSource, chatSource] =
  await Promise.all([
    read("../src/services/demoConversationState.ts"),
    read("../src/Components/Discover.tsx"),
    read("../src/Components/Matches.tsx"),
    read("../src/Components/Chat.tsx"),
  ]);

const compiledState = ts.transpileModule(stateSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const state = await import(
  `data:text/javascript;base64,${Buffer.from(compiledState).toString("base64")}`
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

const storage = new MemoryStorage();
const accountA = "local-user-a-private-id";
const accountB = "local-user-b-private-id";
const reRegisteredAccount = "local-user-c-new-id";
const demoIds = ["noa", "maya", "ido"];

assert.deepEqual(
  state.getEligibleDemoUserIds(accountA, demoIds, storage),
  demoIds,
);
assert.deepEqual(state.getDemoMatchedUserIds(accountA, storage), []);
assert.deepEqual(state.getDemoConversationUserIds(accountA, storage), []);
assert.deepEqual(state.getBlockedDemoUserIds(accountA, storage), []);

assert.equal(state.recordDemoSwipe(accountA, "noa", "like", storage), true);
assert.deepEqual(state.getDemoMatchedUserIds(accountA, storage), ["noa"]);
assert.deepEqual(state.getDemoConversationUserIds(accountA, storage), ["noa"]);

assert.equal(state.recordDemoSwipe(accountA, "maya", "skip", storage), false);
assert.equal(
  state.getDemoConversationUserIds(accountA, storage).includes("maya"),
  false,
);
state.setDemoUserBlocked(accountA, "ido", true, storage);
assert.deepEqual(state.getEligibleDemoUserIds(accountA, demoIds, storage), []);
assert.deepEqual(state.getBlockedDemoUserIds(accountA, storage), ["ido"]);
state.setDemoUserBlocked(accountA, "ido", false, storage);
assert.deepEqual(state.getBlockedDemoUserIds(accountA, storage), []);
assert.deepEqual(state.getEligibleDemoUserIds(accountA, demoIds, storage), ["ido"]);
state.setDemoUserBlocked(accountA, "ido", true, storage);

state.recordDemoSwipe(accountB, "maya", "like", storage);
state.clearDemoConversationState(accountA, storage);
assert.deepEqual(state.getDemoInteractionState(accountA, storage), {
  swipes: {},
  matches: [],
  conversations: [],
  blocked: [],
  hiddenConversations: [],
  dismissed: [],
});
assert.deepEqual(state.getDemoMatchedUserIds(accountB, storage), ["maya"]);

assert.deepEqual(
  state.getEligibleDemoUserIds(reRegisteredAccount, demoIds, storage),
  demoIds,
);
assert.deepEqual(
  state.getDemoConversationUserIds(reRegisteredAccount, storage),
  [],
);
assert.deepEqual(state.getBlockedDemoUserIds(reRegisteredAccount, storage), []);

const accountKey = state.getDemoInteractionStorageKey(accountB);
assert.equal(accountKey.includes(accountB), false);
assert.match(accountKey, /^tripmatch:demo-interactions:[a-z0-9]+$/);

assert.match(discoverSource, /getFreshDemoProfiles/);
assert.match(discoverSource, /recordDemoSwipe\(user\._id, profile\.userId, type\)/);
assert.match(matchesSource, /getDemoMatchedUserIds\(userId\)/);
assert.match(matchesSource, /getDemoConversationUserIds\(userId\)/);
assert.doesNotMatch(matchesSource, /realConversations\.length\s*\?/);
assert.match(chatSource, /isDemoConversationAvailable\(user\?\._id, conversationId\)/);
assert.doesNotMatch(chatSource, /setDemoMessages\(demoChatMessages/);

console.log("Fresh-account demo lifecycle verification: PASS");
