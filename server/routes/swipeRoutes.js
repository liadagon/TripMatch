const express = require("express");
const {
  createSwipe,
  getCurrentUserSwipes,
  getReceivedLikes,
} = require("../controllers/swipeController");
const protect = require("../middleware/auth");
const validate = require("../middleware/validate");
const { createSwipeSchema } = require("../validation/swipeValidation");

const router = express.Router();

router.use(protect);
router.get("/received", getReceivedLikes);
router.post("/", validate(createSwipeSchema), createSwipe);
router.get("/", getCurrentUserSwipes);

module.exports = router;
