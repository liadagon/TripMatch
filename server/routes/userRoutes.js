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
const validate = require("../middleware/validate");
const {
  updateProfileSchema,
} = require("../validation/userValidation");

const router = express.Router();

router.use(protect);

router.get("/me/stats", getCurrentUserStats);
router.put("/me", validate(updateProfileSchema), updateCurrentUser);
router.delete("/me", deleteCurrentUser);
router.put("/:id", rejectLegacyMutation);
router.delete("/:id", rejectLegacyMutation);
router.get("/", getUsers);
router.get("/:id", getUserById);

module.exports = router;
