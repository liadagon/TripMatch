const subscriptionService = require("../services/subscriptionService");

function forwardSubscriptionError(error, next) {
  if (
    error?.name === "PayPalApiError" ||
    error?.name === "PayPalOAuthError"
  ) {
    error.statusCode = 502;
  } else if (error?.name === "PayPalConfigurationError") {
    error.statusCode = 503;
  }

  return next(error);
}

// Keep a controller-level guard behind the route's empty-body Joi schema.
function hasUnexpectedBody(body) {
  return Boolean(body && Object.keys(body).length > 0);
}

/**
 * Builds subscription route handlers around the supplied operations.
 * @param {typeof subscriptionService} operations Subscription business operations.
 * @returns {object} Express handlers for create, read, cancel, and webhook routes.
 */
function createSubscriptionHandlers(operations = subscriptionService) {
  /** Creates or reuses a PayPal subscription for the authenticated user. */
  const createPayPalSubscription = async (req, res, next) => {
    try {
      if (hasUnexpectedBody(req.body)) {
        return res.status(400).json({
          success: false,
          message: "Subscription plan and pricing are configured by the server",
        });
      }

      const result = await operations.createForUser(req.user);
      return res.status(result.reused ? 200 : 201).json({
        success: true,
        subscriptionId: result.subscriptionId,
        approvalUrl: result.approvalUrl,
        status: result.status,
        reused: result.reused,
      });
    } catch (error) {
      return forwardSubscriptionError(error, next);
    }
  };

  /** Refreshes and returns the authenticated user's subscription state. */
  const getMySubscription = async (req, res, next) => {
    try {
      const data = await operations.refreshForUser(req.user);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return forwardSubscriptionError(error, next);
    }
  };

  /** Cancels the authenticated user's current PayPal subscription. */
  const cancelMyPayPalSubscription = async (req, res, next) => {
    try {
      if (hasUnexpectedBody(req.body)) {
        return res.status(400).json({
          success: false,
          message: "The subscription is selected from the authenticated user",
        });
      }

      const data = await operations.cancelForUser(req.user);
      return res.status(200).json({
        success: true,
        message: "PayPal subscription cancelled",
        data,
      });
    } catch (error) {
      return forwardSubscriptionError(error, next);
    }
  };

  /** Verifies and processes an incoming PayPal subscription webhook. */
  const receivePayPalWebhook = async (req, res, next) => {
    try {
      const result = await operations.handleWebhook(req.headers, req.body);
      return res.status(200).json({
        success: true,
        received: true,
        duplicate: result.duplicate,
        ignored: result.ignored,
      });
    } catch (error) {
      return forwardSubscriptionError(error, next);
    }
  };

  return {
    cancelMyPayPalSubscription,
    createPayPalSubscription,
    getMySubscription,
    receivePayPalWebhook,
  };
}

module.exports = {
  ...createSubscriptionHandlers(),
  createSubscriptionHandlers,
};
