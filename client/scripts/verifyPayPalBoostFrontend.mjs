import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import ts from "typescript";

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), "utf8");
}

const utilitySource = await read("../src/utils/subscriptionUi.ts");
const serviceSource = await read("../src/services/subscriptionService.ts");
const likesSource = await read("../src/Components/Likes.tsx");
const returnSource = await read("../src/Components/BoostReturn.tsx");
const appSource = await read("../src/App.tsx");
const snoozeSource = await read("../src/utils/boostPromoSnooze.ts");
const swipeServiceSource = await read("../src/services/swipeService.ts");
const profileSource = await read("../src/Components/Profile.tsx");
const matchedProfileSource = await read("../src/Components/MatchedProfile.tsx");

const { outputText } = ts.transpileModule(utilitySource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
const {
  getSandboxApprovalUrl,
  hasActiveBoost,
  isPendingSubscription,
} = await import(moduleUrl);
const { outputText: snoozeOutput } = ts.transpileModule(snoozeSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
});
const snoozeModule = await import(
  `data:text/javascript;base64,${Buffer.from(snoozeOutput).toString("base64")}`
);

const free = {
  plan: "free",
  status: "none",
  active: false,
  paypalSubscriptionId: null,
  currentPeriodEnd: null,
  canManage: false,
};
const active = {
  ...free,
  plan: "boost",
  status: "active",
  active: true,
  paypalSubscriptionId: "I-TEST",
  canManage: true,
};
const pending = {
  ...free,
  status: "approval_pending",
  paypalSubscriptionId: "I-PENDING",
};

assert.equal(hasActiveBoost(free), false);
assert.equal(hasActiveBoost(active), true);
assert.equal(hasActiveBoost({ ...active, active: false }), false);
assert.equal(isPendingSubscription(pending), true);
assert.equal(hasActiveBoost(pending), false);
assert.equal(
  getSandboxApprovalUrl(
    "https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=I-TEST",
  ),
  "https://www.sandbox.paypal.com/webapps/billing/subscriptions?ba_token=I-TEST",
);
assert.equal(getSandboxApprovalUrl("https://example.com/not-paypal"), null);
assert.equal(getSandboxApprovalUrl("javascript:alert(1)"), null);

assert.match(serviceSource, /api\.post<CreatePayPalSubscriptionResult>\(\s*"\/api\/subscriptions\/paypal"/);
assert.match(serviceSource, /api\.get<[\s\S]*"\/api\/subscriptions\/me"/);
assert.match(serviceSource, /api\.post<[\s\S]*"\/api\/subscriptions\/paypal\/cancel"/);
assert.doesNotMatch(serviceSource, /userId|planId|price|currency/);
assert.match(likesSource, /window\.location\.assign\(approvalUrl\)/);
assert.match(likesSource, /disabled=\{isSubscriptionActionPending\}/);
assert.match(likesSource, /hasActiveBoost\(subscription\)/);
assert.match(likesSource, /isPendingSubscription\(subscription\)/);
assert.match(likesSource, /subscription\?\.status === "approval_pending"/);
assert.match(likesSource, /needsPayPalApproval[\s\S]*handleRefreshSubscription/);
assert.match(likesSource, /await cancelPayPalSubscription\(\)/);
assert.match(likesSource, /await loadSubscription\(\)/);
assert.doesNotMatch(likesSource, /Stripe/);
assert.match(returnSource, /await getMySubscription\(\)/);
assert.match(returnSource, /MAX_AUTOMATIC_CHECKS = 4/);
assert.match(returnSource, /hasActiveBoost\(subscription\)/);
assert.doesNotMatch(returnSource, /useSearchParams|URLSearchParams|location\.search/);
assert.match(appSource, /path="\/boost\/return"/);
assert.match(appSource, /protectedPage\(<BoostReturn \/>\)/);
assert.match(swipeServiceSource, /locked: true/);
assert.match(swipeServiceSource, /locked: false/);
assert.match(likesSource, /result\.locked \? \[\] : result\.data/);
assert.match(likesSource, /totalReceivedLikesCount\} אנשים אהבו אותך/);
assert.match(likesSource, /likes-locked-card/);
assert.match(likesSource, /שדרגי ל-Boost כדי לראות מי אהב אותך/);
assert.match(likesSource, /visibleReceivedLikes\.map/);
assert.match(profileSource, /await getMySubscription\(\)/);
assert.match(profileSource, /hasActiveBoost\(subscription\)/);
assert.match(profileSource, /profile-private-boost-badge/);
assert.doesNotMatch(matchedProfileSource, /Boost|subscription|profile-private-boost-badge/);
assert.match(likesSource, /if \(!isBoostActive\) return;/);
assert.match(likesSource, /clearBoostPromoSnooze\(\)/);

const storageValues = new Map();
const storage = {
  getItem(key) {
    return storageValues.get(key) ?? null;
  },
  setItem(key, value) {
    storageValues.set(key, value);
  },
  removeItem(key) {
    storageValues.delete(key);
  },
};
const now = 1_800_000_000_000;
const snoozeUntil = snoozeModule.snoozeBoostPromo(now, storage);
assert.equal(
  snoozeUntil,
  now + snoozeModule.BOOST_PROMO_SNOOZE_MS,
);
assert.equal(snoozeModule.BOOST_PROMO_SNOOZE_MS, 24 * 60 * 60 * 1000);
assert.equal(snoozeModule.isBoostPromoSnoozed(now + 1, storage), true);
assert.equal(
  snoozeModule.isBoostPromoSnoozed(
    now + snoozeModule.BOOST_PROMO_SNOOZE_MS,
    storage,
  ),
  false,
);

console.log("PayPal Boost frontend verification passed", {
  createEndpointWired: true,
  loadingDisablesCta: true,
  sandboxApprovalRedirectValidated: true,
  missingOrUnsafeApprovalRejected: true,
  freeAndActiveRenderingSeparated: true,
  pendingDoesNotGrantBoost: true,
  cancellationRefreshesAuthoritativeState: true,
  returnRouteQueriesBackend: true,
  queryParametersCannotActivateBoost: true,
  freeLikesRenderOnlyLockedPlaceholders: true,
  activeLikesRenderRealResponse: true,
  privateOwnerBadgeUsesBackendState: true,
  matchedProfilesDoNotRenderBadge: true,
  promoSnoozeHours: 24,
  activeBoostClearsSnooze: true,
});
