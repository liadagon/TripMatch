const express = require("express");
const {
  getCurrentUserMatches,
  getMatchedUserProfile,
} = require("../controllers/matchController");
const protect = require("../middleware/auth");
const validateParams = require("../middleware/validateParams");
const { userIdParamSchema } = require("../validation/idValidation");

const router = express.Router();

router.use(protect);
router.get("/", getCurrentUserMatches);
router.get(
  "/with/:userId/profile",
  validateParams(userIdParamSchema),
  getMatchedUserProfile
);

module.exports = router;
