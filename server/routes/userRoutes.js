const express = require("express");
const {
  getUsers,
  getUserById,
  getCurrentUserStats,
  updateCurrentUser,
  deleteCurrentUser,
  rejectLegacyMutation,
} = require("../controllers/userController");
const protect = require("../middleware/auth");
const requireOnboardingComplete = require("../middleware/requireOnboardingComplete");
const validate = require("../middleware/validate");
const validateQuery = require("../middleware/validateQuery");
const {
  userListQuerySchema,
  updateProfileSchema,
} = require("../validation/userValidation");

const router = express.Router();

router.use(protect);

router.put("/me", validate(updateProfileSchema), updateCurrentUser);
router.delete("/me", deleteCurrentUser);
router.use(requireOnboardingComplete);
router.get("/me/stats", getCurrentUserStats);
router.put("/:id", rejectLegacyMutation);
router.delete("/:id", rejectLegacyMutation);
router.get("/", validateQuery(userListQuerySchema), getUsers);
router.get("/:id", getUserById);

module.exports = router;
