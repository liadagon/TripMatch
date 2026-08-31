import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (relativePath) =>
  readFile(new URL(relativePath, import.meta.url), "utf8");

const [profile, authContext, authService, demoState] = await Promise.all([
  read("../src/Components/Profile.tsx"),
  read("../src/context/AuthContext.tsx"),
  read("../src/services/authService.ts"),
  read("../src/services/demoConversationState.ts"),
]);

assert.match(authService, /isRetryableAccountDeletion/);
assert.match(authService, /ACCOUNT_DELETE_RETRY_DELAY_MS/);
assert.equal(
  authService.match(/api\.delete<\{ success: true \}>\("\/api\/users\/me"\)/g)?.length,
  2,
);
assert.match(authService, /retryError\.response\?\.status === 401/);
assert.doesNotMatch(authService, /deleteCurrentAccount\s*=\s*\([^)]*(?:id|email|subscription)/i);
assert.match(authContext, /await deleteCurrentAccount\(\)/);
assert.match(authContext, /removeAuthToken\(\)/);
assert.match(authContext, /const deletedUserId = user\?\._id/);
assert.match(authContext, /clearDemoConversationState\(deletedUserId\)/);
assert.match(authContext, /clearBoostPromoSnooze\(\)/);
assert.match(authContext, /setUser\(null\)/);
assert.match(demoState, /removeItem\(getDemoInteractionStorageKey\(userId\)\)/);
assert.match(demoState, /removeItem\(HIDDEN_DEMO_CONVERSATIONS_KEY\)/);
assert.match(demoState, /removeItem\(BLOCKED_DEMO_USERS_KEY\)/);
assert.match(profile, /מחיקת חשבון/);
assert.match(profile, /לא ניתן לבטל פעולה זו/);
assert.match(profile, /מחיקת החשבון לצמיתות/);
assert.match(profile, /מנוי TripMatch Boost הפעיל יבוטל/);
assert.match(profile, /await deleteAccount\(\)[\s\S]*navigate\("\/", \{ replace: true \}\)/);
assert.match(profile, /השרת לא הצליח למחוק את החשבון:/);

console.log("Frontend account deletion verification: PASS");
