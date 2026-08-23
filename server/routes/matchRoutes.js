const express = require("express");
const {
  getCurrentUserMatches,
  getMatchesMap,
  getMatchedUserProfile,
} = require("../controllers/matchController");
const protect = require("../middleware/auth");
const requireOnboardingComplete = require("../middleware/requireOnboardingComplete");
const validateParams = require("../middleware/validateParams");
const { userIdParamSchema } = require("../validation/idValidation");

const router = express.Router();

router.use(protect, requireOnboardingComplete);
router.get("/", getCurrentUserMatches);
router.get("/map", getMatchesMap);
router.get(
  "/with/:userId/profile",
  validateParams(userIdParamSchema),
  getMatchedUserProfile
);

module.exports = router;
