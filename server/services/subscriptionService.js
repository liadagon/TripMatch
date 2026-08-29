const crypto = require("crypto");
const ProcessedPayPalWebhookEvent = require("../models/ProcessedPayPalWebhookEvent");
const User = require("../models/User");
const {
  cancelPayPalSubscription,
  createPayPalSubscription,
  getPayPalSubscription,
  requestPayPalAccessToken,
  verifyPayPalWebhookSignature,
} = require("./paypalService");
const {
  hasBoostAccess,
  normalizePayPalSubscriptionStatus,
} = require("../utils/subscriptionEntitlement");
const {
  paypalWebhookEventSchema,
} = require("../validation/subscriptionValidation");

const TERMINAL_STATUSES = new Set(["cancelled", "expired"]);
const EXISTING_SUBSCRIPTION_STATUSES = new Set([
  "approval_pending",
  "approved",
  "active",
  "suspended",
  "payment_failed",
]);
const MANAGEABLE_STATUSES = new Set(["active", "suspended"]);
const SUPPORTED_WEBHOOK_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.CREATED",
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.UPDATED",
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
  "PAYMENT.SALE.COMPLETED",
]);
const REQUIRED_WEBHOOK_HEADERS = Object.freeze([
  "paypal-auth-algo",
  "paypal-cert-url",
  "paypal-transmission-id",
  "paypal-transmission-sig",
  "paypal-transmission-time",
]);

class SubscriptionServiceError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.name = "SubscriptionServiceError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function getRequiredConfiguration(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new SubscriptionServiceError(
      "SUBSCRIPTION_CONFIGURATION_MISSING",
      `${name} is required for PayPal subscriptions`,
      503,
    );
  }
  return value;
}

/** Extracts the approval URL from a PayPal subscription response. */
function getApprovalUrl(subscription) {
  const link = subscription?.links?.find((candidate) => candidate?.rel === "approve");
  return typeof link?.href === "string" ? link.href : "";
}

function getCurrentPeriodEnd(subscription) {
  const nextBillingTime = subscription?.billing_info?.next_billing_time;
  if (!nextBillingTime) return undefined;
  const value = new Date(nextBillingTime);
  return Number.isNaN(value.getTime()) ? undefined : value;
}

/** Returns the client-safe subscription fields for a user document. */
function getSafeSubscriptionState(user) {
  return {
    plan: user?.subscriptionPlan || "free",
    status: user?.subscriptionStatus || "none",
    active: hasBoostAccess(user),
    paypalSubscriptionId: user?.paypalSubscriptionId || null,
    currentPeriodEnd: user?.subscriptionCurrentPeriodEnd || null,
    canManage:
      Boolean(user?.paypalSubscriptionId) &&
      MANAGEABLE_STATUSES.has(user?.subscriptionStatus),
  };
}

function buildSubscriptionPayload(user, planId) {
  const payload = {
    plan_id: planId,
    custom_id: String(user._id),
  };
  const clientUrl = process.env.CLIENT_URL?.trim()?.replace(/\/+$/, "");

  if (clientUrl) {
    payload.application_context = {
      user_action: "SUBSCRIBE_NOW",
      return_url: `${clientUrl}/boost/return`,
      cancel_url: `${clientUrl}/likes?paypal=cancel`,
    };
  }

  return payload;
}

/**
 * Validates plan ownership and persists entitlement state from a PayPal subscription.
 * @param {object} user Mutable Mongoose user document to synchronize.
 * @param {object} subscription PayPal subscription representation.
 * @param {{forcedStatus?: string, allowReplacement?: boolean}} [options] Trusted webhook override and replacement policy.
 * @returns {Promise<object>} Saved user document.
 * @throws {SubscriptionServiceError} When provider metadata, plan, or ownership is inconsistent.
 */
async function synchronizeUserFromPayPal(
  user,
  subscription,
  { forcedStatus, allowReplacement = false } = {},
) {
  const subscriptionId = subscription?.id?.trim();
  const planId = subscription?.plan_id?.trim();
  const configuredPlanId = getRequiredConfiguration("PAYPAL_PLAN_ID_BOOST");

  if (!subscriptionId || !planId) {
    throw new SubscriptionServiceError(
      "INVALID_PAYPAL_SUBSCRIPTION",
      "PayPal subscription metadata is incomplete",
      502,
    );
  }

  if (planId !== configuredPlanId) {
    throw new SubscriptionServiceError(
      "UNEXPECTED_PAYPAL_PLAN",
      "PayPal subscription does not use the configured Boost plan",
      409,
    );
  }

  if (
    user.paypalSubscriptionId &&
    user.paypalSubscriptionId !== subscriptionId &&
    !allowReplacement
  ) {
    throw new SubscriptionServiceError(
      "SUBSCRIPTION_OWNERSHIP_MISMATCH",
      "PayPal subscription does not belong to this user",
      409,
    );
  }

  const status = forcedStatus || normalizePayPalSubscriptionStatus(subscription.status);
  const currentPeriodEnd = getCurrentPeriodEnd(subscription);

  user.paypalSubscriptionId = subscriptionId;
  user.paypalPlanId = planId;
  user.subscriptionStatus = status;
  user.subscriptionPlan = status === "active" ? "boost" : "free";
  if (currentPeriodEnd) user.subscriptionCurrentPeriodEnd = currentPeriodEnd;
  await user.save();

  return user;
}

/** Extracts the related subscription identifier from a PayPal webhook event. */
function extractWebhookSubscriptionId(event) {
  const resource = event?.resource || {};

  if (event?.event_type?.startsWith("BILLING.SUBSCRIPTION.")) {
    return typeof resource.id === "string" ? resource.id : "";
  }

  return (
    resource.billing_agreement_id ||
    resource.supplementary_data?.related_ids?.subscription_id ||
    ""
  );
}

function extractWebhookCustomId(event) {
  return typeof event?.resource?.custom_id === "string"
    ? event.resource.custom_id
    : "";
}

/**
 * Creates subscription operations with injectable PayPal and persistence clients.
 * @param {object} dependencies Optional test or runtime dependency overrides.
 * @returns {object} Subscription lifecycle and webhook operations.
 */
function createSubscriptionOperations(dependencies = {}) {
  const deps = {
    UserModel: User,
    EventModel: ProcessedPayPalWebhookEvent,
    requestAccessToken: requestPayPalAccessToken,
    createSubscription: createPayPalSubscription,
    getSubscription: getPayPalSubscription,
    cancelSubscription: cancelPayPalSubscription,
    verifyWebhook: verifyPayPalWebhookSignature,
    ...dependencies,
  };

  /** Creates or reuses a configured Boost subscription for a user. */
  async function createForUser(user) {
    const planId = getRequiredConfiguration("PAYPAL_PLAN_ID_BOOST");
    const { accessToken } = await deps.requestAccessToken();
    let allowReplacement = false;

    if (user.paypalSubscriptionId) {
      const existing = await deps.getSubscription(
        accessToken,
        user.paypalSubscriptionId,
      );
      await synchronizeUserFromPayPal(user, existing);

      if (EXISTING_SUBSCRIPTION_STATUSES.has(user.subscriptionStatus)) {
        return {
          ...getSafeSubscriptionState(user),
          subscriptionId: user.paypalSubscriptionId,
          approvalUrl: getApprovalUrl(existing) || null,
          reused: true,
        };
      }

      allowReplacement = TERMINAL_STATUSES.has(user.subscriptionStatus);
    }

    const created = await deps.createSubscription(
      accessToken,
      buildSubscriptionPayload(user, planId),
      crypto.randomUUID(),
    );
    const createdStatus = normalizePayPalSubscriptionStatus(created?.status);

    await synchronizeUserFromPayPal(user, created, {
      forcedStatus: createdStatus === "none" ? "approval_pending" : createdStatus,
      allowReplacement,
    });

    const approvalUrl = getApprovalUrl(created);
    if (!approvalUrl) {
      throw new SubscriptionServiceError(
        "PAYPAL_APPROVAL_URL_MISSING",
        "PayPal did not return a subscription approval URL",
        502,
      );
    }

    return {
      ...getSafeSubscriptionState(user),
      subscriptionId: user.paypalSubscriptionId,
      approvalUrl,
      reused: false,
    };
  }

  /** Refreshes a user's stored subscription state from PayPal. */
  async function refreshForUser(user) {
    if (!user.paypalSubscriptionId) return getSafeSubscriptionState(user);
    const { accessToken } = await deps.requestAccessToken();
    const subscription = await deps.getSubscription(
      accessToken,
      user.paypalSubscriptionId,
    );
    await synchronizeUserFromPayPal(user, subscription);
    return getSafeSubscriptionState(user);
  }

  /** Cancels a user's active PayPal subscription and persists the result. */
  async function cancelForUser(user) {
    if (!user.paypalSubscriptionId) {
      throw new SubscriptionServiceError(
        "SUBSCRIPTION_NOT_FOUND",
        "This user does not have a PayPal subscription",
        404,
      );
    }

    const { accessToken } = await deps.requestAccessToken();
    const subscriptionId = user.paypalSubscriptionId;
    await deps.cancelSubscription(
      accessToken,
      subscriptionId,
      "Cancelled by the authenticated TripMatch user",
    );

    try {
      const subscription = await deps.getSubscription(accessToken, subscriptionId);
      await synchronizeUserFromPayPal(user, subscription, {
        forcedStatus: "cancelled",
      });
    } catch (error) {
      user.subscriptionStatus = "cancelled";
      user.subscriptionPlan = "free";
      await user.save();
    }

    return getSafeSubscriptionState(user);
  }

  /**
   * Cancels a remote subscription or proves it is already terminal before account deletion.
   * @param {object} user Stored user whose external subscription must not be orphaned.
   * @returns {Promise<{cancelled: boolean, terminal: true}>} Confirmed remote termination state.
   * @throws {Error} When termination cannot be confirmed safely.
   */
  async function cancelForAccountDeletion(user) {
    const subscriptionId = user?.paypalSubscriptionId?.trim();

    if (!subscriptionId) {
      if (EXISTING_SUBSCRIPTION_STATUSES.has(user?.subscriptionStatus)) {
        throw new SubscriptionServiceError(
          "SUBSCRIPTION_ID_MISSING",
          "The account subscription cannot be cancelled safely",
          409,
        );
      }
      return { cancelled: false, terminal: true };
    }

    const { accessToken } = await deps.requestAccessToken();
    let remoteSubscription;

    try {
      remoteSubscription = await deps.getSubscription(accessToken, subscriptionId);
    } catch (error) {
      if (error?.status === 404) return { cancelled: false, terminal: true };
      throw error;
    }

    const remoteStatus = normalizePayPalSubscriptionStatus(
      remoteSubscription?.status,
    );
    if (TERMINAL_STATUSES.has(remoteStatus)) {
      return { cancelled: false, terminal: true };
    }

    try {
      await deps.cancelSubscription(
        accessToken,
        subscriptionId,
        "Cancelled because the authenticated TripMatch user deleted their account",
      );
    } catch (cancellationError) {
      try {
        const refreshed = await deps.getSubscription(accessToken, subscriptionId);
        const refreshedStatus = normalizePayPalSubscriptionStatus(
          refreshed?.status,
        );
        if (TERMINAL_STATUSES.has(refreshedStatus)) {
          return { cancelled: false, terminal: true };
        }
      } catch (refreshError) {
        if (refreshError?.status === 404) {
          return { cancelled: false, terminal: true };
        }
      }

      throw cancellationError;
    }

    return { cancelled: true, terminal: true };
  }

  async function resolveWebhookUser(event, subscriptionId) {
    let user = subscriptionId
      ? await deps.UserModel.findOne({ paypalSubscriptionId: subscriptionId })
      : null;

    if (user) return user;

    const customId = extractWebhookCustomId(event);
    if (!/^[a-f\d]{24}$/i.test(customId)) return null;
    user = await deps.UserModel.findById(customId);

    if (
      user?.paypalSubscriptionId &&
      user.paypalSubscriptionId !== subscriptionId
    ) {
      return null;
    }

    return user;
  }

  /** Applies a previously verified PayPal webhook to the matching user. */
  async function processVerifiedWebhook(event, accessToken) {
    const eventType = event.event_type;
    const subscriptionId = extractWebhookSubscriptionId(event);
    const user = await resolveWebhookUser(event, subscriptionId);

    if (!SUPPORTED_WEBHOOK_EVENTS.has(eventType) || !subscriptionId || !user) {
      return { ignored: true, subscriptionId: subscriptionId || undefined };
    }

    if (eventType === "BILLING.SUBSCRIPTION.PAYMENT.FAILED") {
      user.subscriptionStatus = "payment_failed";
      user.subscriptionPlan = "free";
      await user.save();
      return { ignored: false, subscriptionId };
    }

    const subscription = await deps.getSubscription(accessToken, subscriptionId);
    const forcedStatuses = {
      "BILLING.SUBSCRIPTION.ACTIVATED": "active",
      "BILLING.SUBSCRIPTION.CANCELLED": "cancelled",
      "BILLING.SUBSCRIPTION.SUSPENDED": "suspended",
      "BILLING.SUBSCRIPTION.EXPIRED": "expired",
    };

    await synchronizeUserFromPayPal(user, subscription, {
      forcedStatus: forcedStatuses[eventType],
    });

    return { ignored: false, subscriptionId };
  }

  /**
   * Verifies PayPal headers before validation, then deduplicates and applies the signed event.
   * @param {object} headers Original lowercase Express request headers.
   * @param {object} event Original, unmodified PayPal event body.
   * @returns {Promise<{duplicate: boolean, ignored: boolean}>} Processing disposition.
   * @throws {SubscriptionServiceError} When signature metadata or the verified event is invalid.
   */
  async function handleWebhook(headers, event) {
    const webhookId = getRequiredConfiguration("PAYPAL_WEBHOOK_ID");
    const missingHeader = REQUIRED_WEBHOOK_HEADERS.find(
      (name) => typeof headers?.[name] !== "string" || !headers[name].trim(),
    );

    if (missingHeader) {
      throw new SubscriptionServiceError(
        "PAYPAL_WEBHOOK_SIGNATURE_MISSING",
        "PayPal webhook signature metadata is incomplete",
        401,
      );
    }

    const { accessToken } = await deps.requestAccessToken();
    const verification = await deps.verifyWebhook(accessToken, {
      headers,
      webhookEvent: event,
      webhookId,
    });

    if (verification?.verification_status !== "SUCCESS") {
      throw new SubscriptionServiceError(
        "PAYPAL_WEBHOOK_NOT_VERIFIED",
        "PayPal webhook signature verification failed",
        401,
      );
    }

    // Validate only after PayPal has verified the original, unmodified event.
    // Unknown provider fields remain accepted and the signed object is not replaced.
    const { error: webhookValidationError } = paypalWebhookEventSchema.validate(
      event,
      { abortEarly: false, convert: false, stripUnknown: false },
    );
    if (webhookValidationError) {
      throw new SubscriptionServiceError(
        "INVALID_PAYPAL_WEBHOOK",
        "PayPal webhook event metadata is incomplete",
      );
    }

    try {
      await deps.EventModel.create({
        eventId: event.id,
        eventType: event.event_type,
        paypalSubscriptionId: extractWebhookSubscriptionId(event) || undefined,
        status: "processing",
      });
    } catch (error) {
      if (error?.code === 11000) {
        return { duplicate: true, ignored: false };
      }
      throw error;
    }

    try {
      const result = await processVerifiedWebhook(event, accessToken);
      await deps.EventModel.updateOne(
        { eventId: event.id, status: "processing" },
        { $set: { status: "processed", processedAt: new Date() } },
      );
      return { ...result, duplicate: false };
    } catch (error) {
      await deps.EventModel.deleteOne({
        eventId: event.id,
        status: "processing",
      });
      throw error;
    }
  }

  return {
    cancelForAccountDeletion,
    cancelForUser,
    createForUser,
    handleWebhook,
    processVerifiedWebhook,
    refreshForUser,
  };
}

const defaultOperations = createSubscriptionOperations();

module.exports = {
  SubscriptionServiceError,
  createSubscriptionOperations,
  extractWebhookSubscriptionId,
  getApprovalUrl,
  getSafeSubscriptionState,
  synchronizeUserFromPayPal,
  ...defaultOperations,
};
