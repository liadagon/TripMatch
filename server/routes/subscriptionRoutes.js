const express = require("express");
const {
  cancelMyPayPalSubscription,
  createPayPalSubscription,
  getMySubscription,
  receivePayPalWebhook,
} = require("../controllers/subscriptionController");
const protect = require("../middleware/auth");

const router = express.Router();

router.post("/paypal/webhook", receivePayPalWebhook);

router.use(protect);
router.post("/paypal", createPayPalSubscription);
router.get("/me", getMySubscription);
router.post("/paypal/cancel", cancelMyPayPalSubscription);

module.exports = router;
