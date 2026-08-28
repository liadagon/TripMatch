const express = require("express");
const {
  cancelMyPayPalSubscription,
  createPayPalSubscription,
  getMySubscription,
  receivePayPalWebhook,
} = require("../controllers/subscriptionController");
const protect = require("../middleware/auth");
const requireOnboardingComplete = require("../middleware/requireOnboardingComplete");
const validate = require("../middleware/validate");
const {
  emptySubscriptionCommandSchema,
} = require("../validation/subscriptionValidation");

const router = express.Router();

// PayPal signature metadata is verified before the signed JSON event is Joi
// validated in subscriptionService; validating or replacing it here would
// risk changing the provider-verification input.
router.post("/paypal/webhook", receivePayPalWebhook);

router.use(protect, requireOnboardingComplete);
// These commands intentionally accept {} only. The controller rejects any
// client-supplied fields because plan and subscription identity are server-owned.
router.post(
  "/paypal",
  validate(emptySubscriptionCommandSchema),
  createPayPalSubscription,
);
router.get("/me", getMySubscription);
router.post(
  "/paypal/cancel",
  validate(emptySubscriptionCommandSchema),
  cancelMyPayPalSubscription,
);

module.exports = router;
