import type {
  SubscriptionState,
  SubscriptionStatus,
} from "../services/subscriptionService";

const PENDING_STATUSES = new Set<SubscriptionStatus>([
  "approval_pending",
  "approved",
]);

/** Indicates whether server state currently grants Boost access. */
export function hasActiveBoost(subscription: SubscriptionState | null) {
  return Boolean(
    subscription?.active &&
      subscription.plan === "boost" &&
      subscription.status === "active",
  );
}

/** Indicates whether PayPal approval or activation is still pending. */
export function isPendingSubscription(subscription: SubscriptionState | null) {
  return Boolean(subscription && PENDING_STATUSES.has(subscription.status));
}

/** Returns an allowlisted PayPal Sandbox approval URL or null. */
export function getSandboxApprovalUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value);
    const allowedHosts = new Set([
      "sandbox.paypal.com",
      "www.sandbox.paypal.com",
    ]);

    return url.protocol === "https:" && allowedHosts.has(url.hostname)
      ? url.href
      : null;
  } catch {
    return null;
  }
}

/** Maps an internal subscription status to its localized UI label. */
export function getSubscriptionStatusLabel(status: SubscriptionStatus) {
  const labels: Record<SubscriptionStatus, string> = {
    none: "ללא מנוי",
    approval_pending: "ממתין לאישור ב-PayPal",
    approved: "אושר וממתין להפעלה",
    active: "פעיל",
    suspended: "מושהה",
    cancelled: "בוטל",
    expired: "פג תוקף",
    payment_failed: "התשלום נכשל",
  };

  return labels[status];
}
