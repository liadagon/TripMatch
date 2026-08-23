const ACTIVE_STATUS = "active";

const PAYPAL_STATUS_MAP = Object.freeze({
  APPROVAL_PENDING: "approval_pending",
  APPROVED: "approved",
  ACTIVE: ACTIVE_STATUS,
  SUSPENDED: "suspended",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
});

function normalizePayPalSubscriptionStatus(status) {
  if (typeof status !== "string") return "none";
  const normalized = status.trim().toUpperCase();
  return PAYPAL_STATUS_MAP[normalized] || "none";
}

function hasBoostAccess(user) {
  return (
    user?.subscriptionPlan === "boost" &&
    user?.subscriptionStatus === ACTIVE_STATUS &&
    Boolean(user?.paypalSubscriptionId) &&
    Boolean(user?.paypalPlanId) &&
    user.paypalPlanId === process.env.PAYPAL_PLAN_ID_BOOST?.trim()
  );
}

module.exports = {
  ACTIVE_STATUS,
  hasBoostAccess,
  normalizePayPalSubscriptionStatus,
};
